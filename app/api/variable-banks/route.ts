import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth/require-role';

const FIELD_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

function validateFields(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !FIELD_NAME_RE.test(item)) return null;
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

export async function GET() {
  const session = await requireRole('viewer');
  if (isAuthError(session)) return session;

  try {
    const { db, tables } = await getDatabase();
    const banks = await db.select().from(tables.variableBanks);
    return NextResponse.json(banks.map((b) => ({
      id: b.id,
      name: b.name,
      fields: b.fields,
    })));
  } catch (e) {
    console.error('GET /api/variable-banks failed:', e);
    return NextResponse.json({ error: 'Failed to list variable banks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireRole('admin');
  if (isAuthError(session)) return session;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name } = body as { name?: string };
  const fields = validateFields(body.fields);

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!fields || fields.length === 0) {
    return NextResponse.json({ error: 'fields must be a non-empty array of valid field names' }, { status: 400 });
  }

  try {
    const { db, tables } = await getDatabase();
    const id = crypto.randomUUID();
    await db.insert(tables.variableBanks).values({
      id,
      name: name.trim(),
      fields,
      createdAt: new Date(),
    });

    return NextResponse.json({ id, name: name.trim(), fields }, { status: 201 });
  } catch (e) {
    console.error('POST /api/variable-banks failed:', e);
    return NextResponse.json({ error: 'Failed to create variable bank' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireRole('admin');
  if (isAuthError(session)) return session;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, name } = body as { id?: string; name?: string };
  const fields = validateFields(body.fields);

  if (!id || !name?.trim()) {
    return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
  }
  if (!fields || fields.length === 0) {
    return NextResponse.json({ error: 'fields must be a non-empty array of valid field names' }, { status: 400 });
  }

  try {
    const { db, tables } = await getDatabase();
    await db.update(tables.variableBanks)
      .set({ name: name.trim(), fields })
      .where(eq(tables.variableBanks.id, id));
    return NextResponse.json({ id, name: name.trim(), fields });
  } catch (e) {
    console.error('PUT /api/variable-banks failed:', e);
    return NextResponse.json({ error: 'Failed to update variable bank' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireRole('admin');
  if (isAuthError(session)) return session;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const { db, tables } = await getDatabase();
    await db.delete(tables.variableBanks).where(eq(tables.variableBanks.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/variable-banks failed:', e);
    return NextResponse.json({ error: 'Failed to delete variable bank' }, { status: 500 });
  }
}
