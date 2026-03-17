import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, document, thumbnail } = body;

  if (!document) {
    return NextResponse.json({ error: 'document is required' }, { status: 400 });
  }

  const { db, tables } = getDatabase();

  const labelRows = await db
    .select()
    .from(tables.labels)
    .where(eq(tables.labels.id, id))
    .limit(1);

  if (labelRows.length === 0) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 });
  }

  // Update label name and timestamp
  const now = new Date();
  await db
    .update(tables.labels)
    .set({ name: name || labelRows[0].name, updatedAt: now })
    .where(eq(tables.labels.id, id));

  // Get latest version
  const versions = await db
    .select()
    .from(tables.labelVersions)
    .where(eq(tables.labelVersions.labelId, id))
    .orderBy(desc(tables.labelVersions.version))
    .limit(1);

  let thumbnailData: Buffer | string | null = null;
  if (thumbnail) {
    const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');
    if (isPostgres) {
      thumbnailData = thumbnail;
    } else {
      const base64 = thumbnail.replace(/^data:image\/\w+;base64,/, '');
      thumbnailData = Buffer.from(base64, 'base64');
    }
  }

  const latest = versions[0];

  if (latest && latest.status === 'draft') {
    // Overwrite existing draft
    await db
      .update(tables.labelVersions)
      .set({
        document,
        thumbnail: thumbnailData ?? latest.thumbnail,
        createdAt: now,
      })
      .where(eq(tables.labelVersions.id, latest.id));

    return NextResponse.json({
      id,
      name: name || labelRows[0].name,
      version: latest.version,
      status: 'draft',
    });
  } else {
    // Create new draft version
    const newVersion = (latest?.version ?? 0) + 1;
    const versionId = crypto.randomUUID();

    await db.insert(tables.labelVersions).values({
      id: versionId,
      labelId: id,
      version: newVersion,
      status: 'draft',
      document,
      thumbnail: thumbnailData,
      createdAt: now,
    });

    return NextResponse.json({
      id,
      name: name || labelRows[0].name,
      version: newVersion,
      status: 'draft',
    });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { db, tables } = getDatabase();

  // Delete versions first (cascade should handle this, but be explicit)
  await db
    .delete(tables.labelVersions)
    .where(eq(tables.labelVersions.labelId, id));

  await db
    .delete(tables.labels)
    .where(eq(tables.labels.id, id));

  return NextResponse.json({ ok: true });
}
