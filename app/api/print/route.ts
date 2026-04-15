import { NextRequest, NextResponse } from 'next/server';
import { validateDocument } from '@/lib/documents/validate';
import { validatePrintRequest } from '@/lib/documents/validate-print';
import { executePrint } from '@/lib/print/execute';
import { requireRole, isAuthError } from '@/lib/auth/require-role';
import type { LabelDocument } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await requireRole('editor');
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

  try {
    const doc = rawDoc as LabelDocument;
    const { jobId } = await executePrint({
      doc,
      data: data as Record<string, string>[],
      printer,
      copies: copyCount,
      siteId,
      labelId: typeof labelId === 'string' ? labelId : undefined,
      labelName: typeof labelName === 'string' ? labelName : undefined,
    });

    return NextResponse.json({ jobId, status: 'queued', printer }, { status: 202 });
  } catch (e) {
    console.error('POST /api/print failed:', e);
    return NextResponse.json({ error: 'Failed to print' }, { status: 500 });
  }
}
