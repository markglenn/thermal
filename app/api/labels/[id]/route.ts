import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  findLabel,
  findLatestActiveVersion,
  getDatabase,
  parseThumbnail,
  summaryFieldsFromDocument,
} from '@/lib/server/labels';
import { validateDocumentDeep } from '@/lib/documents/validate';
import { requireRole, isAuthError } from '@/lib/auth/require-role';
import { logAudit } from '@/lib/auth/audit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('viewer');
  if (isAuthError(session)) return session;

  try {
    const { id } = await params;
    const label = await findLabel(id);
    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const latest = await findLatestActiveVersion(id);
    if (!latest) {
      return NextResponse.json({ error: 'No versions found' }, { status: 404 });
    }

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
  const session = await requireRole('editor');
  if (isAuthError(session)) return session;

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

    const latest = await findLatestActiveVersion(id);
    const labelName = name || label.name;

    if (latest && latest.status === 'published') {
      return NextResponse.json(
        { error: 'Latest version is published. Create a new version first.' },
        { status: 409 }
      );
    }

    const now = new Date();
    const thumbnailData = parseThumbnail(thumbnail);
    const summary = summaryFieldsFromDocument(document);
    const { db, tables } = await getDatabase();

    await db.transaction(async (tx) => {
      await tx.update(tables.labels)
        .set({ name: labelName, updatedAt: now })
        .where(eq(tables.labels.id, id));
      if (latest) {
        await tx.update(tables.labelVersions)
          .set({
            document,
            thumbnail: thumbnailData ?? latest.thumbnail,
            ...summary,
            updatedAt: now,
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
          ...summary,
          createdAt: now,
        });
      }
    });

    logAudit(session, 'label.updated', id, { name: labelName });

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('editor');
  if (isAuthError(session)) return session;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name } = body as { name?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const label = await findLabel(id);
    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const { db, tables } = await getDatabase();
    await db.update(tables.labels)
      .set({ name: name.trim(), updatedAt: new Date() })
      .where(eq(tables.labels.id, id));

    logAudit(session, 'label.renamed', id, { name: name.trim() });

    return NextResponse.json({ id, name: name.trim() });
  } catch (e) {
    console.error('PATCH /api/labels/[id] failed:', e);
    return NextResponse.json({ error: 'Failed to rename label' }, { status: 500 });
  }
}

/** Archive or unarchive a label (soft delete). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('editor');
  if (isAuthError(session)) return session;

  try {
    const { id } = await params;
    const label = await findLabel(id);
    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const unarchive = request.nextUrl.searchParams.get('unarchive') === 'true';
    const now = new Date();
    const { db, tables } = await getDatabase();

    await db.update(tables.labels)
      .set({ archivedAt: unarchive ? null : now, updatedAt: now })
      .where(eq(tables.labels.id, id));

    logAudit(session, unarchive ? 'label.unarchived' : 'label.archived', id);

    return NextResponse.json({ ok: true, archived: !unarchive });
  } catch (e) {
    console.error('DELETE /api/labels/[id] failed:', e);
    return NextResponse.json({ error: 'Failed to archive label' }, { status: 500 });
  }
}
