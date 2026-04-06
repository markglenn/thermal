import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  findLabel,
  findLatestActiveVersion,
  findHighestVersionNumber,
  listVersionSummaries,
  getDatabase,
  parseThumbnail,
  summaryFieldsFromDocument,
} from '@/lib/server/labels';
import { validateDocumentDeep } from '@/lib/documents/validate';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const includeArchived = request.nextUrl.searchParams.get('archived') === 'true';

    const label = await findLabel(id);
    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const summaries = await listVersionSummaries(id, includeArchived);
    return NextResponse.json(summaries);
  } catch (e) {
    console.error('GET /api/labels/[id]/versions failed:', e);
    return NextResponse.json({ error: 'Failed to list versions' }, { status: 500 });
  }
}

/** Create a new version from the current document. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { document, thumbnail } = body as { document?: unknown; thumbnail?: string };

  if (!document) {
    return NextResponse.json({ error: 'document is required' }, { status: 400 });
  }

  const docResult = validateDocumentDeep(document);
  if (!docResult.valid) {
    return NextResponse.json({ error: 'Invalid document structure', details: docResult.errors }, { status: 400 });
  }

  try {
    const { id } = await params;
    const label = await findLabel(id);
    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const latestActive = await findLatestActiveVersion(id);

    if (latestActive && latestActive.status !== 'published') {
      return NextResponse.json(
        { error: 'Latest version is already editable. Save to it instead.' },
        { status: 409 }
      );
    }

    const highestVersion = await findHighestVersionNumber(id);
    const newVersion = highestVersion + 1;
    const now = new Date();
    const thumbnailData = parseThumbnail(thumbnail);
    const summary = summaryFieldsFromDocument(document);
    const { db, tables } = await getDatabase();

    await db.transaction(async (tx) => {
      await tx.update(tables.labels)
        .set({ updatedAt: now })
        .where(eq(tables.labels.id, id));
      await tx.insert(tables.labelVersions).values({
        id: crypto.randomUUID(),
        labelId: id,
        version: newVersion,
        status: null,
        document,
        thumbnail: thumbnailData ?? (latestActive?.thumbnail as Buffer | null) ?? null,
        ...summary,
        createdAt: now,
      });
    });

    return NextResponse.json({
      id,
      name: label.name,
      version: newVersion,
      status: null,
    }, { status: 201 });
  } catch (e) {
    console.error('POST /api/labels/[id]/versions failed:', e);
    return NextResponse.json({ error: 'Failed to create new version' }, { status: 500 });
  }
}
