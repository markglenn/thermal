import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db, tables } = await getDatabase();

    const versions = await db
      .select({ thumbnail: tables.labelVersions.thumbnail })
      .from(tables.labelVersions)
      .where(eq(tables.labelVersions.labelId, id))
      .orderBy(desc(tables.labelVersions.version))
      .limit(1);

    const thumb = versions[0]?.thumbnail;
    if (!thumb) {
      return new NextResponse(null, { status: 404 });
    }

    // libsql returns ArrayBuffer, pg may return string
    const buf = typeof thumb === 'string'
      ? Buffer.from(thumb, 'base64')
      : Buffer.from(thumb);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    console.error('GET /api/labels/[id]/thumbnail failed:', e);
    return new NextResponse(null, { status: 500 });
  }
}
