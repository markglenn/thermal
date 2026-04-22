import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth/require-role';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  const session = await requireRole('viewer', request);
  if (isAuthError(session)) return session;

  try {
    const { id, version: versionStr } = await params;
    const version = parseInt(versionStr, 10);
    if (isNaN(version) || version < 1) {
      return new NextResponse(null, { status: 400 });
    }

    const { db, tables } = await getDatabase();

    const rows = await db
      .select({ thumbnail: tables.labelVersions.thumbnail })
      .from(tables.labelVersions)
      .where(
        and(
          eq(tables.labelVersions.labelId, id),
          eq(tables.labelVersions.version, version)
        )
      )
      .limit(1);

    const thumb = rows[0]?.thumbnail;
    if (!thumb) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(new Uint8Array(thumb), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    console.error('GET /api/labels/[id]/versions/[version]/thumbnail failed:', e);
    return new NextResponse(null, { status: 500 });
  }
}
