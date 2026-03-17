import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, sql } from 'drizzle-orm';
import { getDatabase, parseThumbnail } from '@/lib/db';
import { validateDocument } from '@/lib/documents/validate';

export async function GET() {
  try {
    const { db, tables } = getDatabase();

    // Two queries instead of N+1: all labels + latest version per label
    const allLabels = await db
      .select()
      .from(tables.labels)
      .orderBy(desc(tables.labels.updatedAt));

    // Get all latest versions in a single query using a subquery for max version per label
    const latestVersions = allLabels.length > 0
      ? await db
          .select()
          .from(tables.labelVersions)
          .where(
            sql`(${tables.labelVersions.labelId}, ${tables.labelVersions.version}) IN (
              SELECT ${tables.labelVersions.labelId}, MAX(${tables.labelVersions.version})
              FROM ${tables.labelVersions}
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
      let thumbnailUrl: string | null = null;
      if (latest?.thumbnail) {
        if (typeof latest.thumbnail === 'string') {
          thumbnailUrl = latest.thumbnail;
        } else if (Buffer.isBuffer(latest.thumbnail)) {
          thumbnailUrl = `data:image/png;base64,${latest.thumbnail.toString('base64')}`;
        }
      }

      return {
        id: label.id,
        name: label.name,
        thumbnailUrl,
        latestVersion: latest?.version ?? 0,
        latestStatus: latest?.status ?? 'draft',
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
    const { db, tables } = getDatabase();

    const labelId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = new Date();
    const thumbnailData = parseThumbnail(thumbnail);

    // Transaction so label + version are created atomically
    db.transaction((tx) => {
      tx.insert(tables.labels).values({
        id: labelId,
        name,
        createdAt: now,
        updatedAt: now,
      }).run();
      tx.insert(tables.labelVersions).values({
        id: versionId,
        labelId,
        version: 1,
        status: 'draft',
        document,
        thumbnail: thumbnailData,
        createdAt: now,
      }).run();
    });

    return NextResponse.json({
      id: labelId,
      name,
      version: 1,
      status: 'draft',
    }, { status: 201 });
  } catch (e) {
    console.error('POST /api/labels failed:', e);
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 });
  }
}
