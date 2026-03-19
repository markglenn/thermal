import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';

export async function GET() {
  try {
    const { db, tables } = await getDatabase();
    const sizes = await db.select().from(tables.labelSizes);
    return NextResponse.json(sizes.map((s) => ({
      id: s.id,
      name: s.name,
      widthInches: s.widthInches,
      heightInches: s.heightInches,
      dpi: s.dpi,
    })));
  } catch (e) {
    console.error('GET /api/label-sizes failed:', e);
    return NextResponse.json({ error: 'Failed to list label sizes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, widthInches, heightInches, dpi } = body as {
    name?: string;
    widthInches?: number;
    heightInches?: number;
    dpi?: number;
  };

  if (!name || !widthInches || !heightInches || !dpi) {
    return NextResponse.json({ error: 'name, widthInches, heightInches, and dpi are required' }, { status: 400 });
  }

  if (![203, 300, 600].includes(dpi)) {
    return NextResponse.json({ error: 'dpi must be 203, 300, or 600' }, { status: 400 });
  }

  try {
    const { db, tables } = await getDatabase();
    const id = crypto.randomUUID();
    await db.insert(tables.labelSizes).values({
      id,
      name,
      widthInches,
      heightInches,
      dpi,
      createdAt: new Date(),
    });

    return NextResponse.json({ id, name, widthInches, heightInches, dpi }, { status: 201 });
  } catch (e) {
    console.error('POST /api/label-sizes failed:', e);
    return NextResponse.json({ error: 'Failed to create label size' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, name, widthInches, heightInches, dpi } = body as {
    id?: string;
    name?: string;
    widthInches?: number;
    heightInches?: number;
    dpi?: number;
  };

  if (!id || !name || !widthInches || !heightInches || !dpi) {
    return NextResponse.json({ error: 'id, name, widthInches, heightInches, and dpi are required' }, { status: 400 });
  }

  if (![203, 300, 600].includes(dpi)) {
    return NextResponse.json({ error: 'dpi must be 203, 300, or 600' }, { status: 400 });
  }

  try {
    const { db, tables } = await getDatabase();
    await db.update(tables.labelSizes)
      .set({ name, widthInches, heightInches, dpi })
      .where(eq(tables.labelSizes.id, id));
    return NextResponse.json({ id, name, widthInches, heightInches, dpi });
  } catch (e) {
    console.error('PUT /api/label-sizes failed:', e);
    return NextResponse.json({ error: 'Failed to update label size' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const { db, tables } = await getDatabase();
    await db.delete(tables.labelSizes).where(eq(tables.labelSizes.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/label-sizes failed:', e);
    return NextResponse.json({ error: 'Failed to delete label size' }, { status: 500 });
  }
}
