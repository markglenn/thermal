import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { getDatabase, parseThumbnail } from '@/lib/db';
import { validateDocument } from '@/lib/documents/validate';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const label = labelRows[0];

    // Get latest non-archived version
    const versions = await db
      .select()
      .from(tables.labelVersions)
      .where(and(eq(tables.labelVersions.labelId, id), isNull(tables.labelVersions.archivedAt)))
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
    const { db, tables } = await getDatabase();

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

    // Get latest non-archived version
    const versions = await db
      .select()
      .from(tables.labelVersions)
      .where(and(eq(tables.labelVersions.labelId, id), isNull(tables.labelVersions.archivedAt)))
      .orderBy(desc(tables.labelVersions.version))
      .limit(1);

    const latest = versions[0];
    const labelName = name || labelRows[0].name;

    if (latest && latest.status === 'production') {
      return NextResponse.json(
        { error: 'Latest version is in production. Create a new version first.' },
        { status: 409 }
      );
    }

    // Overwrite latest version — transaction for atomicity
    await db.transaction(async (tx) => {
      await tx.update(tables.labels)
        .set({ name: labelName, updatedAt: now })
        .where(eq(tables.labels.id, id));
      if (latest) {
        await tx.update(tables.labelVersions)
          .set({
            document,
            thumbnail: thumbnailData ?? latest.thumbnail,
            createdAt: now,
          })
          .where(eq(tables.labelVersions.id, latest.id));
      } else {
        await tx.insert(tables.labelVersions).values({
          id: crypto.randomUUID(),
          labelId: id,
          version: 1,
          status: null,
          document,
          thumbnail: thumbnailData,
          createdAt: now,
        });
      }
    });

    return NextResponse.json({
      id,
      name: labelName,
      version: latest?.version ?? 1,
      status: latest?.status ?? null,
    });
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
    const { db, tables } = await getDatabase();

    await db.transaction(async (tx) => {
      await tx.delete(tables.labelVersions)
        .where(eq(tables.labelVersions.labelId, id));
      await tx.delete(tables.labels)
        .where(eq(tables.labels.id, id));
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/labels/[id] failed:', e);
    return NextResponse.json({ error: 'Failed to delete label' }, { status: 500 });
  }
}
