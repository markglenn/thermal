import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { getDatabase, parseThumbnail } from '@/lib/db';
import { validateDocument } from '@/lib/documents/validate';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const includeArchived = request.nextUrl.searchParams.get('archived') === 'true';
    const { db, tables } = await getDatabase();

    const labelRows = await db
      .select()
      .from(tables.labels)
      .where(eq(tables.labels.id, id))
      .limit(1);

    if (labelRows.length === 0) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const whereClause = includeArchived
      ? eq(tables.labelVersions.labelId, id)
      : and(eq(tables.labelVersions.labelId, id), isNull(tables.labelVersions.archivedAt));

    const versions = await db
      .select({
        id: tables.labelVersions.id,
        version: tables.labelVersions.version,
        status: tables.labelVersions.status,
        hasThumbnail: sql<boolean>`${tables.labelVersions.thumbnail} IS NOT NULL`.as('has_thumbnail'),
        archivedAt: tables.labelVersions.archivedAt,
        createdAt: tables.labelVersions.createdAt,
        document: tables.labelVersions.document,
      })
      .from(tables.labelVersions)
      .where(whereClause)
      .orderBy(desc(tables.labelVersions.version));

    return NextResponse.json(
      versions.map((v) => {
        const doc = v.document as { label?: Record<string, unknown> } | undefined;
        const label = doc?.label;
        let widthInches: number | null = null;
        let heightInches: number | null = null;
        if (label) {
          if (Array.isArray(label.variants) && label.variants.length > 0) {
            const variant = (label.variants as Array<{ name: string; widthDots: number; heightDots: number }>)
              .find((va) => va.name === label.activeVariant) ?? label.variants[0] as { widthDots: number; heightDots: number };
            const dpi = (label.dpi as number) || 203;
            widthInches = variant.widthDots / dpi;
            heightInches = variant.heightDots / dpi;
          } else if (typeof label.widthInches === 'number' && typeof label.heightInches === 'number') {
            widthInches = label.widthInches as number;
            heightInches = label.heightInches as number;
          }
        }
        return {
          id: v.id,
          version: v.version,
          status: v.status,
          hasThumbnail: !!v.hasThumbnail,
          widthInches,
          heightInches,
          archivedAt: v.archivedAt?.toISOString() ?? null,
          createdAt: v.createdAt.toISOString(),
        };
      })
    );
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

    // Get highest version number (including archived) for next version number
    const allVersions = await db
      .select()
      .from(tables.labelVersions)
      .where(eq(tables.labelVersions.labelId, id))
      .orderBy(desc(tables.labelVersions.version))
      .limit(1);

    // Get latest non-archived version for editability check
    const activeVersions = await db
      .select()
      .from(tables.labelVersions)
      .where(and(eq(tables.labelVersions.labelId, id), isNull(tables.labelVersions.archivedAt)))
      .orderBy(desc(tables.labelVersions.version))
      .limit(1);

    const latestActive = activeVersions[0];

    if (latestActive && latestActive.status !== 'published') {
      return NextResponse.json(
        { error: 'Latest version is already editable. Save to it instead.' },
        { status: 409 }
      );
    }

    const newVersion = (allVersions[0]?.version ?? 0) + 1;
    const now = new Date();
    const thumbnailData = parseThumbnail(thumbnail);

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
        thumbnail: thumbnailData ?? latestActive?.thumbnail ?? null,
        createdAt: now,
      });
    });

    return NextResponse.json({
      id,
      name: labelRows[0].name,
      version: newVersion,
      status: null,
    }, { status: 201 });
  } catch (e) {
    console.error('POST /api/labels/[id]/versions failed:', e);
    return NextResponse.json({ error: 'Failed to create new version' }, { status: 500 });
  }
}
