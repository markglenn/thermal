import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth/require-role';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('viewer');
  if (isAuthError(session)) return session;

  try {
    const { id } = await params;
    const { db, tables } = await getDatabase();

    const versions = await db
      .select({ thumbnail: tables.labelVersions.thumbnail })
      .from(tables.labelVersions)
      .where(and(eq(tables.labelVersions.labelId, id), isNull(tables.labelVersions.archivedAt)))
      .orderBy(desc(tables.labelVersions.version))
      .limit(1);

    const thumb = versions[0]?.thumbnail;
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
    console.error('GET /api/labels/[id]/thumbnail failed:', e);
    return new NextResponse(null, { status: 500 });
  }
}
