import { eq } from 'drizzle-orm';
import { generateZplMerge } from '@/lib/zpl/generator-merge';
import { publishPrintJob } from './sqs';
import { listSites } from './discovery';
import { createBatchImageLoader } from './image-loader';
import { getDatabase } from '@/lib/db';
import type { LabelDocument } from '@/lib/types';

const DPI_TO_DPMM: Record<number, string> = { 203: '8dpmm', 300: '12dpmm', 600: '24dpmm' };

export interface ExecutePrintOptions {
  doc: LabelDocument;
  data: Record<string, string>[];
  printer: string;
  copies: number;
  siteId?: string;
  /** Label ID and version for metadata — optional for unsaved labels. */
  labelId?: string;
  labelVersion?: number;
  labelName?: string;
}

export interface ExecutePrintResult {
  jobId: string;
  zpl: string;
}

export async function executePrint(opts: ExecutePrintOptions): Promise<ExecutePrintResult> {
  const { doc, data, printer, copies, siteId } = opts;

  // Generate merged ZPL. The loader dedupes identical image URLs across
  // rows and caps concurrent fetch+convert to avoid hammering the image
  // host (and Node's socket pool) when batch jobs have 100+ variable
  // images. 8 overlaps async fetches with sharp's libuv-bound conversion
  // work without overwhelming the default 4-thread pool.
  const imageLoader = createBatchImageLoader();
  const zplBlocks = await Promise.all(
    data.map((fields, index) => generateZplMerge(doc, fields, index, imageLoader))
  );
  const zpl = zplBlocks.join('\n');

  // Resolve queue URL from site manifest
  let queueUrl: string | undefined;
  if (siteId) {
    const sites = await listSites();
    const site = sites.find((s) => s.siteId === siteId);
    if (!site) throw new Error(`Site "${siteId}" not found`);
    queueUrl = site.queueUrl;
  }

  const jobId = crypto.randomUUID();
  const variant = doc.label.variants[0];
  const w = parseFloat((variant.widthDots / doc.label.dpi).toFixed(2));
  const h = parseFloat((variant.heightDots / doc.label.dpi).toFixed(2));

  // Record the job as 'queued' BEFORE attempting SQS send. If the send
  // fails, we flip to 'failed' with the error. This guarantees (a) a DB
  // row exists when the print server's reply lands, (b) SQS-send errors
  // surface to the user immediately instead of waiting for the 5-min
  // TTL, and (c) no "queued but never sent" zombies if the process dies
  // mid-send — those will still be caught by the TTL.
  const { db, tables } = await getDatabase();
  await db.insert(tables.printJobs).values({
    id: jobId,
    labelId: opts.labelId ?? null,
    labelVersion: opts.labelVersion ?? null,
    siteId: siteId ?? null,
    printer,
    status: 'queued',
    copies,
    totalChunks: 1,
    createdAt: new Date(),
  });

  try {
    await publishPrintJob(jobId, zpl, printer, copies, 'application/vnd.zebra.zpl', {
      labelId: opts.labelId ?? 'unsaved',
      labelVersion: opts.labelVersion ?? 0,
      labelName: opts.labelName ?? 'Untitled',
      labelSize: `${w}x${h}`,
      dpmm: DPI_TO_DPMM[doc.label.dpi] || '8dpmm',
    }, queueUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send print job to queue';
    await db.update(tables.printJobs)
      .set({ status: 'failed', error: message, completedAt: new Date() })
      .where(eq(tables.printJobs.id, jobId));
    throw err;
  }

  return { jobId, zpl };
}
