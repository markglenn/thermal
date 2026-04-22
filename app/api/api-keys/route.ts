import { NextRequest, NextResponse } from 'next/server';
import { desc, isNull } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth/require-role';
import { logAudit } from '@/lib/auth/audit';
import { generateApiKey } from '@/lib/auth/api-keys';
import { ALLOWED_API_KEY_ROLES, type Role } from '@/lib/auth/roles';

export async function GET(request: NextRequest) {
  const session = await requireRole('admin', request);
  if (isAuthError(session)) return session;

  try {
    const { db, tables } = await getDatabase();
    const includeRevoked = request.nextUrl.searchParams.get('includeRevoked') === 'true';

    const query = db
      .select({
        id: tables.apiKeys.id,
        name: tables.apiKeys.name,
        prefix: tables.apiKeys.prefix,
        role: tables.apiKeys.role,
        createdBy: tables.apiKeys.createdBy,
        createdAt: tables.apiKeys.createdAt,
        lastUsedAt: tables.apiKeys.lastUsedAt,
        revokedAt: tables.apiKeys.revokedAt,
      })
      .from(tables.apiKeys)
      .orderBy(desc(tables.apiKeys.createdAt));

    const rows = includeRevoked
      ? await query
      : await query.where(isNull(tables.apiKeys.revokedAt));

    return NextResponse.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      role: r.role,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      revokedAt: r.revokedAt?.toISOString() ?? null,
    })));
  } catch (e) {
    console.error('GET /api/api-keys failed:', e);
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireRole('admin', request);
  if (isAuthError(session)) return session;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const role = typeof body.role === 'string' ? (body.role as Role) : undefined;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!role || !(ALLOWED_API_KEY_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${ALLOWED_API_KEY_ROLES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const { db, tables } = await getDatabase();
    const { raw, prefix, hash } = generateApiKey();
    const id = crypto.randomUUID();
    const createdAt = new Date();

    await db.insert(tables.apiKeys).values({
      id,
      name,
      prefix,
      keyHash: hash,
      role,
      createdBy: session.user.sub,
      createdAt,
    });

    logAudit(session, 'api_key.created', id, { name, role });

    return NextResponse.json({
      id,
      name,
      prefix,
      role,
      createdBy: session.user.sub,
      createdAt: createdAt.toISOString(),
      lastUsedAt: null,
      revokedAt: null,
      // Only returned on create — never retrievable again.
      secret: raw,
    }, { status: 201 });
  } catch (e) {
    console.error('POST /api/api-keys failed:', e);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}
