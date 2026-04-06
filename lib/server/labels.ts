import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { getDatabase, parseThumbnail } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types returned by service helpers
// ---------------------------------------------------------------------------

export interface LabelRow {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface VersionRow {
  id: string;
  labelId: string;
  version: number;
  status: 'published' | null;
  document: unknown;
  thumbnail: unknown;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  widthDots: number | null;
  heightDots: number | null;
  dpi: number | null;
}

export interface VersionSummary {
  id: string;
  version: number;
  status: string | null;
  hasThumbnail: boolean;
  widthInches: number | null;
  heightInches: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// ---------------------------------------------------------------------------
// Label size extraction from document
// ---------------------------------------------------------------------------

export function extractLabelSize(doc: unknown): { widthDots: number; heightDots: number; dpi: number } | null {
  if (typeof doc !== 'object' || doc === null) return null;
  const d = doc as Record<string, unknown>;
  if (typeof d.label !== 'object' || d.label === null) return null;
  const label = d.label as Record<string, unknown>;
  const dpi = typeof label.dpi === 'number' ? label.dpi : 203;

  if (Array.isArray(label.variants) && label.variants.length > 0) {
    const variant = label.variants[0] as Record<string, unknown>;
    if (typeof variant.widthDots === 'number' && typeof variant.heightDots === 'number') {
      return { widthDots: variant.widthDots, heightDots: variant.heightDots, dpi };
    }
  }

  // Legacy format
  if (typeof label.widthInches === 'number' && typeof label.heightInches === 'number') {
    return {
      widthDots: Math.round((label.widthInches as number) * dpi),
      heightDots: Math.round((label.heightInches as number) * dpi),
      dpi,
    };
  }

  return null;
}

/** Convert dots to inches using the given DPI. */
export function dotsToInches(dots: number, dpi: number): number {
  return dots / dpi;
}

/** Build summary metadata for a version row (for list endpoints). */
export function versionToSummary(v: {
  id: string;
  version: number;
  status: string | null;
  hasThumbnail: boolean;
  widthDots: number | null;
  heightDots: number | null;
  dpi: number | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}): VersionSummary {
  let widthInches: number | null = null;
  let heightInches: number | null = null;
  if (v.widthDots != null && v.heightDots != null && v.dpi != null) {
    widthInches = dotsToInches(v.widthDots, v.dpi);
    heightInches = dotsToInches(v.heightDots, v.dpi);
  }
  return {
    id: v.id,
    version: v.version,
    status: v.status,
    hasThumbnail: v.hasThumbnail,
    widthInches,
    heightInches,
    archivedAt: v.archivedAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt?.toISOString() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Find a label by ID. Returns null if not found. */
export async function findLabel(id: string): Promise<LabelRow | null> {
  const { db, tables } = await getDatabase();
  const rows = await db
    .select()
    .from(tables.labels)
    .where(eq(tables.labels.id, id))
    .limit(1);
  return (rows[0] as LabelRow | undefined) ?? null;
}

/** Find the latest non-archived version for a label. */
export async function findLatestActiveVersion(labelId: string): Promise<VersionRow | null> {
  const { db, tables } = await getDatabase();
  const rows = await db
    .select()
    .from(tables.labelVersions)
    .where(and(eq(tables.labelVersions.labelId, labelId), isNull(tables.labelVersions.archivedAt)))
    .orderBy(desc(tables.labelVersions.version))
    .limit(1);
  return (rows[0] as VersionRow | undefined) ?? null;
}

/** Find the highest version number (including archived) for a label. */
export async function findHighestVersionNumber(labelId: string): Promise<number> {
  const { db, tables } = await getDatabase();
  const rows = await db
    .select({ version: tables.labelVersions.version })
    .from(tables.labelVersions)
    .where(eq(tables.labelVersions.labelId, labelId))
    .orderBy(desc(tables.labelVersions.version))
    .limit(1);
  return rows[0]?.version ?? 0;
}

/** Find the published version, falling back to latest non-archived. */
export async function findPublishedOrLatestVersion(
  labelId: string
): Promise<{ version: number; document: unknown } | null> {
  const { db, tables } = await getDatabase();

  // Try published first
  let rows = await db
    .select({ version: tables.labelVersions.version, document: tables.labelVersions.document })
    .from(tables.labelVersions)
    .where(and(eq(tables.labelVersions.labelId, labelId), eq(tables.labelVersions.status, 'published')))
    .orderBy(desc(tables.labelVersions.version))
    .limit(1);

  if (rows.length === 0) {
    rows = await db
      .select({ version: tables.labelVersions.version, document: tables.labelVersions.document })
      .from(tables.labelVersions)
      .where(and(eq(tables.labelVersions.labelId, labelId), isNull(tables.labelVersions.archivedAt)))
      .orderBy(desc(tables.labelVersions.version))
      .limit(1);
  }

  return rows[0] ?? null;
}

/** Find a specific version by label ID and version number. */
export async function findVersion(
  labelId: string,
  version: number
): Promise<{ version: number; document: unknown } | null> {
  const { db, tables } = await getDatabase();
  const rows = await db
    .select({ version: tables.labelVersions.version, document: tables.labelVersions.document })
    .from(tables.labelVersions)
    .where(and(eq(tables.labelVersions.labelId, labelId), eq(tables.labelVersions.version, version)))
    .limit(1);
  return rows[0] ?? null;
}

/** List version summaries for a label (no document blobs). */
export async function listVersionSummaries(
  labelId: string,
  includeArchived: boolean
): Promise<VersionSummary[]> {
  const { db, tables } = await getDatabase();
  const whereClause = includeArchived
    ? eq(tables.labelVersions.labelId, labelId)
    : and(eq(tables.labelVersions.labelId, labelId), isNull(tables.labelVersions.archivedAt));

  const rows = await db
    .select({
      id: tables.labelVersions.id,
      version: tables.labelVersions.version,
      status: tables.labelVersions.status,
      hasThumbnail: sql<boolean>`${tables.labelVersions.thumbnail} IS NOT NULL`.as('has_thumbnail'),
      widthDots: tables.labelVersions.widthDots,
      heightDots: tables.labelVersions.heightDots,
      dpi: tables.labelVersions.dpi,
      archivedAt: tables.labelVersions.archivedAt,
      createdAt: tables.labelVersions.createdAt,
      updatedAt: tables.labelVersions.updatedAt,
    })
    .from(tables.labelVersions)
    .where(whereClause)
    .orderBy(desc(tables.labelVersions.version));

  return rows.map((r) =>
    versionToSummary({
      ...r,
      hasThumbnail: !!r.hasThumbnail,
    })
  );
}

/** Get latest version summary per label (for label list). No document blobs. */
export async function listLatestVersionSummaries(): Promise<
  Map<string, { version: number; status: string | null; hasThumbnail: boolean; widthInches: number | null; heightInches: number | null }>
> {
  const { db, tables } = await getDatabase();

  const rows = await db
    .select({
      labelId: tables.labelVersions.labelId,
      version: tables.labelVersions.version,
      status: tables.labelVersions.status,
      hasThumbnail: sql<boolean>`${tables.labelVersions.thumbnail} IS NOT NULL`.as('has_thumbnail'),
      widthDots: tables.labelVersions.widthDots,
      heightDots: tables.labelVersions.heightDots,
      dpi: tables.labelVersions.dpi,
    })
    .from(tables.labelVersions)
    .where(
      sql`(${tables.labelVersions.labelId}, ${tables.labelVersions.version}) IN (
        SELECT ${tables.labelVersions.labelId}, MAX(${tables.labelVersions.version})
        FROM ${tables.labelVersions}
        WHERE ${tables.labelVersions.archivedAt} IS NULL
        GROUP BY ${tables.labelVersions.labelId}
      )`
    );

  const map = new Map<string, { version: number; status: string | null; hasThumbnail: boolean; widthInches: number | null; heightInches: number | null }>();
  for (const r of rows) {
    let widthInches: number | null = null;
    let heightInches: number | null = null;
    if (r.widthDots != null && r.heightDots != null && r.dpi != null) {
      widthInches = dotsToInches(r.widthDots, r.dpi);
      heightInches = dotsToInches(r.heightDots, r.dpi);
    }
    map.set(r.labelId, {
      version: r.version,
      status: r.status,
      hasThumbnail: !!r.hasThumbnail,
      widthInches,
      heightInches,
    });
  }

  return map;
}

// ---------------------------------------------------------------------------
// Mutation helpers
// ---------------------------------------------------------------------------

/** Compute summary metadata fields from a document for storage alongside the version. */
export function summaryFieldsFromDocument(doc: unknown): { widthDots: number | null; heightDots: number | null; dpi: number | null } {
  const size = extractLabelSize(doc);
  if (!size) return { widthDots: null, heightDots: null, dpi: null };
  return { widthDots: size.widthDots, heightDots: size.heightDots, dpi: size.dpi };
}

export { getDatabase, parseThumbnail };
