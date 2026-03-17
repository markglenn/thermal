import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';

export async function GET() {
  const { db, tables } = getDatabase();

  const allLabels = await db
    .select()
    .from(tables.labels)
    .orderBy(desc(tables.labels.updatedAt));

  const result = await Promise.all(
    allLabels.map(async (label: { id: string; name: string; updatedAt: Date }) => {
      const versions = await db
        .select()
        .from(tables.labelVersions)
        .where(eq(tables.labelVersions.labelId, label.id))
        .orderBy(desc(tables.labelVersions.version))
        .limit(1);

      const latest = versions[0];
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
    })
  );

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, document, thumbnail } = body;

  if (!name || !document) {
    return NextResponse.json({ error: 'name and document are required' }, { status: 400 });
  }

  const { db, tables } = getDatabase();

  const labelId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const now = new Date();

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

  await db.insert(tables.labels).values({
    id: labelId,
    name,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(tables.labelVersions).values({
    id: versionId,
    labelId,
    version: 1,
    status: 'draft',
    document,
    thumbnail: thumbnailData,
    createdAt: now,
  });

  return NextResponse.json({
    id: labelId,
    name,
    version: 1,
    status: 'draft',
  }, { status: 201 });
}
