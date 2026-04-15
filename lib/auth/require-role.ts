import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasRole, type Role } from './roles';

export type AuthSession = {
  user: { sub: string; email?: string | null; name?: string | null; role: Role };
};

/**
 * Require the caller to have at least `minimumRole`.
 * Returns the session on success, or a NextResponse (401/403) on failure.
 */
export async function requireRole(
  minimumRole: Role
): Promise<AuthSession | NextResponse> {
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
