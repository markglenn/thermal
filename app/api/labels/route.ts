import { NextRequest, NextResponse } from 'next/server';
import { desc, isNull } from 'drizzle-orm';
import { getDatabase, parseThumbnail, listLatestVersionSummaries, summaryFieldsFromDocument } from '@/lib/server/labels';
import { validateDocumentDeep } from '@/lib/documents/validate';

export async function GET(request: NextRequest) {
  try {
    const { db, tables } = await getDatabase();
    const includeArchived = request.nextUrl.searchParams.get('archived') === 'true';

    const allLabels = includeArchived
      ? await db.select().from(tables.labels).orderBy(desc(tables.labels.updatedAt))
      : await db.select().from(tables.labels).where(isNull(tables.labels.archivedAt)).orderBy(desc(tables.labels.updatedAt));

    const versionByLabelId = await listLatestVersionSummaries();

    const result = allLabels.map((label) => {
      const latest = versionByLabelId.get(label.id);
      return {
        id: label.id,
        name: label.name,
        hasThumbnail: latest?.hasThumbnail ?? false,
        latestVersion: latest?.version ?? 0,
        latestStatus: latest?.status ?? null,
        widthInches: latest?.widthInches ?? null,
        heightInches: latest?.heightInches ?? null,
        archivedAt: label.archivedAt?.toISOString() ?? null,
        updatedAt: label.updatedAt.toISOString(),
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/labels failed:', e);
    return NextResponse.json({ error: 'Failed to list labels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, document, thumbnail } = body as { name?: string; document?: unknown; thumbnail?: string };

  if (!name || !document) {
    return NextResponse.json({ error: 'name and document are required' }, { status: 400 });
  }

  const docResult = validateDocumentDeep(document);
  if (!docResult.valid) {
    return NextResponse.json({ error: 'Invalid document structure', details: docResult.errors }, { status: 400 });
  }

  try {
    const { db, tables } = await getDatabase();

    const labelId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = new Date();
    const thumbnailData = parseThumbnail(thumbnail);
    const summary = summaryFieldsFromDocument(document);

    await db.transaction(async (tx) => {
      await tx.insert(tables.labels).values({
        id: labelId,
        name,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(tables.labelVersions).values({
        id: versionId,
        labelId,
        version: 1,
        status: null,
        document,
        thumbnail: thumbnailData,
        ...summary,
        createdAt: now,
      });
    });

    return NextResponse.json({
      id: labelId,
      name,
      version: 1,
      status: null,
    }, { status: 201 });
  } catch (e) {
    console.error('POST /api/labels failed:', e);
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 });
  }
}
