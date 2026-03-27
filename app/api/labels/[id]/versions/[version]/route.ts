import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  try {
    const { id, version: versionStr } = await params;
    const version = parseInt(versionStr, 10);
    if (isNaN(version) || version < 1) {
      return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
    }

    const { db, tables } = await getDatabase();

    const labelRows = await db
      .select()
      .from(tables.labels)
      .where(eq(tables.labels.id, id))
      .limit(1);

    if (labelRows.length === 0) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const rows = await db
      .select()
      .from(tables.labelVersions)
      .where(
        and(
          eq(tables.labelVersions.labelId, id),
          eq(tables.labelVersions.version, version)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const row = rows[0];
    return NextResponse.json({
      id: labelRows[0].id,
      name: labelRows[0].name,
      version: row.version,
      status: row.status,
      document: row.document,
      updatedAt: labelRows[0].updatedAt.toISOString(),
    });
  } catch (e) {
    console.error('GET /api/labels/[id]/versions/[version] failed:', e);
    return NextResponse.json({ error: 'Failed to get version' }, { status: 500 });
  }
}

/**
 * PATCH — update a version's published flag or archive status.
 * Body can include:
 *   { production: true/false } — publish or unpublish the version
 *   { archived: true/false } — archive or unarchive the version
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { production, archived } = body as { production?: boolean; archived?: boolean };
  if (production === undefined && archived === undefined) {
    return NextResponse.json({ error: 'Must provide production or archived' }, { status: 400 });
  }

  try {
    const { id, version: versionStr } = await params;
    const version = parseInt(versionStr, 10);
    if (isNaN(version) || version < 1) {
      return NextResponse.json({ error: 'Invalid version number' }, { status: 400 });
    }

    const { db, tables } = await getDatabase();

    const target = await db
      .select()
      .from(tables.labelVersions)
      .where(
        and(
          eq(tables.labelVersions.labelId, id),
          eq(tables.labelVersions.version, version)
        )
      )
      .limit(1);

    if (target.length === 0) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      if (production !== undefined) {
        if (production) {
          // Clear any existing production flag for this label
          await tx.update(tables.labelVersions)
            .set({ status: null })
            .where(eq(tables.labelVersions.labelId, id));
          // Set this version as production
          await tx.update(tables.labelVersions)
            .set({ status: 'published' })
            .where(eq(tables.labelVersions.id, target[0].id));
        } else {
          await tx.update(tables.labelVersions)
            .set({ status: null })
            .where(eq(tables.labelVersions.id, target[0].id));
        }
      }

      if (archived !== undefined) {
        // Cannot archive a production version
        const currentStatus = production !== undefined
          ? (production ? 'published' : null)
          : target[0].status;
        if (archived && currentStatus === 'published') {
          throw new Error('CANNOT_ARCHIVE_PRODUCTION');
        }
        await tx.update(tables.labelVersions)
          .set({ archivedAt: archived ? now : null })
          .where(eq(tables.labelVersions.id, target[0].id));
      }

      await tx.update(tables.labels)
        .set({ updatedAt: now })
        .where(eq(tables.labels.id, id));
    });

    return NextResponse.json({
      version: target[0].version,
      status: production !== undefined ? (production ? 'published' : null) : target[0].status,
      archivedAt: archived ? now.toISOString() : archived === false ? null : (target[0].archivedAt?.toISOString() ?? null),
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'CANNOT_ARCHIVE_PRODUCTION') {
      return NextResponse.json({ error: 'Cannot archive a published version.' }, { status: 400 });
    }
    console.error('PATCH /api/labels/[id]/versions/[version] failed:', e);
    return NextResponse.json({ error: 'Failed to update version' }, { status: 500 });
  }
}
