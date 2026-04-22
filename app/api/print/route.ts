import { NextRequest, NextResponse } from 'next/server';
import { validateDocument } from '@/lib/documents/validate';
import { validatePrintRequest } from '@/lib/documents/validate-print';
import { validateRequiredFields } from '@/lib/documents/validate-required';
import { executePrint } from '@/lib/print/execute';
import { MAX_PRINT_ROWS } from '@/lib/print/limits';
import { requireRole, isAuthError } from '@/lib/auth/require-role';
import { logger } from '@/lib/logger';
import type { LabelDocument } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await requireRole('service', request);
  if (isAuthError(session)) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;
  const { document: rawDoc, labelId, labelName } = obj as { document?: unknown; labelId?: string; labelName?: string };

  if (!rawDoc) {
    return NextResponse.json({ error: 'document is required' }, { status: 400 });
  }

  if (!validateDocument(rawDoc)) {
    return NextResponse.json({ error: 'Invalid document structure' }, { status: 400 });
  }

  const printResult = validatePrintRequest(body);
  if (!printResult.valid || !printResult.parsed) {
    return NextResponse.json(
      { error: 'Invalid print request', details: printResult.errors },
      { status: 400 }
    );
  }

  const { data, printer, copies: copyCount, siteId } = printResult.parsed;

  if (!printer) {
    return NextResponse.json({ error: 'printer is required' }, { status: 400 });
  }

  if (data.length > MAX_PRINT_ROWS) {
    return NextResponse.json(
      {
        error: 'Too many labels in one job',
        details: [`Max ${MAX_PRINT_ROWS} labels per print job; received ${data.length}.`],
      },
      { status: 400 },
    );
  }

  const doc = rawDoc as LabelDocument;
  const requiredErrors = validateRequiredFields(doc, data as Record<string, string>[]);
  if (requiredErrors.length > 0) {
    return NextResponse.json(
      { error: 'Missing required fields', details: requiredErrors },
      { status: 400 }
    );
  }

  try {
    const { jobId } = await executePrint({
      doc,
      data: data as Record<string, string>[],
      printer,
      copies: copyCount,
      siteId,
      labelId: typeof labelId === 'string' ? labelId : undefined,
      labelName: typeof labelName === 'string' ? labelName : undefined,
    });

    logger.info(
      { jobId, siteId, printer, rows: data.length, copies: copyCount, labelId },
      'print job accepted',
    );
    return NextResponse.json({ jobId, status: 'queued', printer }, { status: 202 });
  } catch (err) {
    logger.error({ err, siteId, printer }, 'print job failed to queue');
    return NextResponse.json({ error: 'Failed to print' }, { status: 500 });
  }
}
