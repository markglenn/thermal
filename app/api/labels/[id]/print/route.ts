import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';
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
    const { db, tables } = await getDatabase();

    const labelRows = await db
      .select()
      .from(tables.labels)
      .where(eq(tables.labels.id, id))
      .limit(1);

    if (labelRows.length === 0) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const versionParam = request.nextUrl.searchParams.get('version');
    let versionRows;

    if (versionParam) {
      const versionNum = parseInt(versionParam, 10);
      if (isNaN(versionNum) || versionNum < 1) {
        return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
      }
      versionRows = await db
        .select({
          version: tables.labelVersions.version,
          document: tables.labelVersions.document,
        })
        .from(tables.labelVersions)
        .where(
          and(
            eq(tables.labelVersions.labelId, id),
            eq(tables.labelVersions.version, versionNum)
          )
        )
        .limit(1);
    } else {
      // Default: published version, falling back to latest non-archived
      versionRows = await db
        .select({
          version: tables.labelVersions.version,
          document: tables.labelVersions.document,
        })
        .from(tables.labelVersions)
        .where(
          and(
            eq(tables.labelVersions.labelId, id),
            eq(tables.labelVersions.status, 'published')
          )
        )
        .orderBy(desc(tables.labelVersions.version))
        .limit(1);

      // No published version — fall back to latest non-archived
      if (versionRows.length === 0) {
        versionRows = await db
          .select({
            version: tables.labelVersions.version,
            document: tables.labelVersions.document,
          })
          .from(tables.labelVersions)
          .where(and(eq(tables.labelVersions.labelId, id), isNull(tables.labelVersions.archivedAt)))
          .orderBy(desc(tables.labelVersions.version))
          .limit(1);
      }
    }

    if (versionRows.length === 0) {
      const msg = versionParam
        ? 'Version not found'
        : 'No versions found';
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    const { version: labelVersion, document: rawDoc } = versionRows[0];

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
    await publishPrintJob(jobId, zpl, printer, copyCount, {
      labelId: id,
      labelVersion,
      labelName: labelRows[0].name,
    });

    // Record the job
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
