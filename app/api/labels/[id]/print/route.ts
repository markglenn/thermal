import { NextRequest, NextResponse } from 'next/server';
import {
  findLabel,
  findPublishedOrLatestVersion,
  findVersion,
  getDatabase,
} from '@/lib/server/labels';
import { generateZplMerge } from '@/lib/zpl/generator-merge';
import { publishPrintJob } from '@/lib/print/sqs';
import { validateDocument } from '@/lib/documents/validate';
import { validatePrintRequest } from '@/lib/documents/validate-print';
import type { LabelDocument } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const printResult = validatePrintRequest(body);
  if (!printResult.valid || !printResult.parsed) {
    return NextResponse.json(
      { error: 'Invalid print request', details: printResult.errors },
      { status: 400 }
    );
  }

  const { data, printer, copies: copyCount } = printResult.parsed;

  try {
    const { id } = await params;
    const label = await findLabel(id);
    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    // Resolve which version to print
    const versionParam = request.nextUrl.searchParams.get('version');
    let versionRow: { version: number; document: unknown } | null;

    if (versionParam) {
      const versionNum = parseInt(versionParam, 10);
      if (isNaN(versionNum) || versionNum < 1) {
        return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
      }
      versionRow = await findVersion(id, versionNum);
      if (!versionRow) {
        return NextResponse.json({ error: 'Version not found' }, { status: 404 });
      }
    } else {
      versionRow = await findPublishedOrLatestVersion(id);
      if (!versionRow) {
        return NextResponse.json({ error: 'No versions found' }, { status: 404 });
      }
    }

    const { version: labelVersion, document: rawDoc } = versionRow;

    if (!validateDocument(rawDoc)) {
      return NextResponse.json(
        { error: 'Stored document is corrupt or incompatible' },
        { status: 500 }
      );
    }
    const doc = rawDoc as LabelDocument;

    // Generate merged ZPL for each data entry, passing index for counter variables
    const zplBlocks = await Promise.all(
      (data as Record<string, string>[]).map((fields, index) =>
        generateZplMerge(doc, fields, index)
      )
    );

    // If no printer specified, return raw ZPL (backward compatible)
    if (!printer) {
      return new NextResponse(zplBlocks.join('\n'), {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Queue to SQS for remote printing
    const jobId = crypto.randomUUID();
    const zpl = zplBlocks.join('\n');
    const dpiToDpmm: Record<number, string> = { 203: '8dpmm', 300: '12dpmm', 600: '24dpmm' };
    const variant = doc.label.variants[0];
    const w = parseFloat((variant.widthDots / doc.label.dpi).toFixed(2));
    const h = parseFloat((variant.heightDots / doc.label.dpi).toFixed(2));
    const labelSize = `${w}x${h}`;
    await publishPrintJob(jobId, zpl, printer, copyCount, 'application/vnd.zebra.zpl', {
      labelId: id,
      labelVersion,
      labelName: label.name,
      labelSize,
      dpmm: dpiToDpmm[doc.label.dpi] || '8dpmm',
    });

    // Record the job
    const { db, tables } = await getDatabase();
    await db.insert(tables.printJobs).values({
      id: jobId,
      labelId: id,
      labelVersion,
      printer,
      status: 'queued',
      copies: copyCount,
      totalChunks: 1,
      createdAt: new Date(),
    });

    return NextResponse.json({
      jobId,
      status: 'queued',
      printer,
    }, { status: 202 });
  } catch (e) {
    console.error('POST /api/labels/[id]/print failed:', e);
    return NextResponse.json({ error: 'Failed to generate print data' }, { status: 500 });
  }
}
