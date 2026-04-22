import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth/require-role';
import { logAudit } from '@/lib/auth/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('admin', request);
  if (isAuthError(session)) return session;

  try {
    const { id } = await params;
    const { db, tables } = await getDatabase();

    const existing = await db
      .select({ id: tables.apiKeys.id, name: tables.apiKeys.name })
      .from(tables.apiKeys)
      .where(and(eq(tables.apiKeys.id, id), isNull(tables.apiKeys.revokedAt)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'API key not found or already revoked' }, { status: 404 });
    }

    await db
      .update(tables.apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(tables.apiKeys.id, id));

    logAudit(session, 'api_key.revoked', id, { name: existing[0].name });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/api-keys/[id] failed:', e);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
}
