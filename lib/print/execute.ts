import { generateZplMerge } from '@/lib/zpl/generator-merge';
import { publishPrintJob } from './sqs';
import { listSites } from './discovery';
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

  // Generate merged ZPL
  const zplBlocks = await Promise.all(
    data.map((fields, index) => generateZplMerge(doc, fields, index))
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

  // Queue to SQS
  const jobId = crypto.randomUUID();
  const variant = doc.label.variants[0];
  const w = parseFloat((variant.widthDots / doc.label.dpi).toFixed(2));
  const h = parseFloat((variant.heightDots / doc.label.dpi).toFixed(2));

  await publishPrintJob(jobId, zpl, printer, copies, 'application/vnd.zebra.zpl', {
    labelId: opts.labelId ?? 'unsaved',
    labelVersion: opts.labelVersion ?? 0,
    labelName: opts.labelName ?? 'Untitled',
    labelSize: `${w}x${h}`,
    dpmm: DPI_TO_DPMM[doc.label.dpi] || '8dpmm',
  }, queueUrl);

  // Record the job in DB
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

  return { jobId, zpl };
}
