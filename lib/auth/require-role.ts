import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { hasRole, type Role, ROLES } from './roles';
import { parseBearerApiKey, verifyApiKey } from './api-keys';
import { getDatabase } from '@/lib/db';
import { logger } from '@/lib/logger';

export type AuthSession = {
  user: { sub: string; email?: string | null; name?: string | null; role: Role };
};

/**
 * Require the caller to have at least `minimumRole`.
 * Returns the session on success, or a NextResponse (401/403) on failure.
 *
 * When `request` is provided, the Authorization header is checked first —
 * a valid Bearer API key synthesizes a session whose role is the key's
 * role. If no bearer is present, the NextAuth session cookie is used.
 */
export async function requireRole(
  minimumRole: Role,
  request?: Request,
): Promise<AuthSession | NextResponse> {
  if (request) {
    const bearer = await authenticateBearer(request);
    if (bearer) {
      if (!hasRole(bearer.user.role, minimumRole)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return bearer;
    }
  }

  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasRole(session.user.role, minimumRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return session as AuthSession;
}

/** Type guard: true when requireRole returned an error response. */
export function isAuthError(
  result: AuthSession | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

async function authenticateBearer(request: Request): Promise<AuthSession | null> {
  const parsed = parseBearerApiKey(request.headers.get('authorization'));
  if (!parsed) return null;

  const { db, tables } = await getDatabase();
  const rows = await db
    .select()
    .from(tables.apiKeys)
    .where(eq(tables.apiKeys.prefix, parsed.prefix))
    .limit(1);

  const row = rows[0];
  if (!row || row.revokedAt) return null;
  if (!verifyApiKey(parsed.raw, row.keyHash)) return null;
  if (!(ROLES as readonly string[]).includes(row.role)) {
    logger.warn({ apiKeyId: row.id, role: row.role }, 'api key has unknown role');
    return null;
  }

  // Touch lastUsedAt — don't await, don't block the response. Errors here
  // only affect observability, so a failed write is logged and ignored.
  db.update(tables.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(tables.apiKeys.id, row.id))
    .catch((err) => logger.warn({ err, apiKeyId: row.id }, 'failed to update api key lastUsedAt'));

  return {
    user: {
      sub: `apikey:${row.id}`,
      email: null,
      name: row.name,
      role: row.role as Role,
    },
  };
}
