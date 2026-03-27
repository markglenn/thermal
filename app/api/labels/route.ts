import { NextRequest, NextResponse } from 'next/server';
import { desc, sql } from 'drizzle-orm';
import { getDatabase, parseThumbnail } from '@/lib/db';
import { validateDocument } from '@/lib/documents/validate';

export async function GET() {
  try {
    const { db, tables } = await getDatabase();

    // Two queries instead of N+1: all labels + latest version per label
    const allLabels = await db
      .select()
      .from(tables.labels)
      .orderBy(desc(tables.labels.updatedAt));

    // Get latest version metadata (no document/thumbnail blob) in a single query
    const latestVersions = allLabels.length > 0
      ? await db
          .select({
            labelId: tables.labelVersions.labelId,
            version: tables.labelVersions.version,
            status: tables.labelVersions.status,
            hasThumbnail: sql<boolean>`${tables.labelVersions.thumbnail} IS NOT NULL`.as('has_thumbnail'),
          })
          .from(tables.labelVersions)
          .where(
            sql`(${tables.labelVersions.labelId}, ${tables.labelVersions.version}) IN (
              SELECT ${tables.labelVersions.labelId}, MAX(${tables.labelVersions.version})
              FROM ${tables.labelVersions}
              WHERE ${tables.labelVersions.archivedAt} IS NULL
              GROUP BY ${tables.labelVersions.labelId}
            )`
          )
      : [];

    // Index by labelId for O(1) lookup
    const versionByLabelId = new Map<string, typeof latestVersions[0]>();
    for (const v of latestVersions) {
      versionByLabelId.set(v.labelId, v);
    }

    const result = allLabels.map((label) => {
      const latest = versionByLabelId.get(label.id);
      return {
        id: label.id,
        name: label.name,
        hasThumbnail: !!latest?.hasThumbnail,
        latestVersion: latest?.version ?? 0,
        latestStatus: latest?.status ?? null,
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

  if (!validateDocument(document)) {
    return NextResponse.json({ error: 'Invalid document structure' }, { status: 400 });
  }

  try {
    const { db, tables } = await getDatabase();

    const labelId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = new Date();
    const thumbnailData = parseThumbnail(thumbnail);

    // Transaction so label + version are created atomically
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
