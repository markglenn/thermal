import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDatabase, parseThumbnail } from '@/lib/db';
import { validateDocument } from '@/lib/documents/validate';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db, tables } = getDatabase();

    const labelRows = await db
      .select()
      .from(tables.labels)
      .where(eq(tables.labels.id, id))
      .limit(1);

    if (labelRows.length === 0) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const label = labelRows[0];

    const versions = await db
      .select()
      .from(tables.labelVersions)
      .where(eq(tables.labelVersions.labelId, id))
      .orderBy(desc(tables.labelVersions.version))
      .limit(1);

    if (versions.length === 0) {
      return NextResponse.json({ error: 'No versions found' }, { status: 404 });
    }

    const latest = versions[0];

    return NextResponse.json({
      id: label.id,
      name: label.name,
      version: latest.version,
      status: latest.status,
      document: latest.document,
      updatedAt: label.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error('GET /api/labels/[id] failed:', e);
    return NextResponse.json({ error: 'Failed to get label' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, document, thumbnail } = body as { name?: string; document?: unknown; thumbnail?: string };

  if (!document) {
    return NextResponse.json({ error: 'document is required' }, { status: 400 });
  }

  if (!validateDocument(document)) {
    return NextResponse.json({ error: 'Invalid document structure' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const { db, tables } = getDatabase();

    const labelRows = await db
      .select()
      .from(tables.labels)
      .where(eq(tables.labels.id, id))
      .limit(1);

    if (labelRows.length === 0) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const now = new Date();
    const thumbnailData = parseThumbnail(thumbnail);

    // Get latest version
    const versions = await db
      .select()
      .from(tables.labelVersions)
      .where(eq(tables.labelVersions.labelId, id))
      .orderBy(desc(tables.labelVersions.version))
      .limit(1);

    const latest = versions[0];
    const labelName = name || labelRows[0].name;

    if (latest && latest.status === 'draft') {
      // Overwrite existing draft — transaction for atomicity
      db.transaction((tx) => {
        tx.update(tables.labels)
          .set({ name: labelName, updatedAt: now })
          .where(eq(tables.labels.id, id))
          .run();
        tx.update(tables.labelVersions)
          .set({
            document,
            thumbnail: thumbnailData ?? latest.thumbnail,
            createdAt: now,
          })
          .where(eq(tables.labelVersions.id, latest.id))
          .run();
      });

      return NextResponse.json({
        id,
        name: labelName,
        version: latest.version,
        status: 'draft',
      });
    } else {
      // Create new draft version
      const newVersion = (latest?.version ?? 0) + 1;
      const versionId = crypto.randomUUID();

      db.transaction((tx) => {
        tx.update(tables.labels)
          .set({ name: labelName, updatedAt: now })
          .where(eq(tables.labels.id, id))
          .run();
        tx.insert(tables.labelVersions).values({
          id: versionId,
          labelId: id,
          version: newVersion,
          status: 'draft',
          document,
          thumbnail: thumbnailData,
          createdAt: now,
        }).run();
      });

      return NextResponse.json({
        id,
        name: labelName,
        version: newVersion,
        status: 'draft',
      });
    }
  } catch (e) {
    console.error('PUT /api/labels/[id] failed:', e);
    return NextResponse.json({ error: 'Failed to save label' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db, tables } = getDatabase();

    // Cascade handles versions, but be explicit for safety
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.transaction((tx: any) => {
      tx.delete(tables.labelVersions)
        .where(eq(tables.labelVersions.labelId, id))
        .run();
      tx.delete(tables.labels)
        .where(eq(tables.labels.id, id))
        .run();
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/labels/[id] failed:', e);
    return NextResponse.json({ error: 'Failed to delete label' }, { status: 500 });
  }
}
