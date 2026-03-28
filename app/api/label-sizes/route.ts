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
      widthDots: s.widthDots,
      heightDots: s.heightDots,
      unit: s.unit,
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

  const { name, widthDots, heightDots, unit, dpi } = body as {
    name?: string;
    widthDots?: number;
    heightDots?: number;
    unit?: string;
    dpi?: number;
  };

  if (!name || !widthDots || !heightDots || !dpi) {
    return NextResponse.json({ error: 'name, widthDots, heightDots, and dpi are required' }, { status: 400 });
  }

  if (![203, 300, 600].includes(dpi)) {
    return NextResponse.json({ error: 'dpi must be 203, 300, or 600' }, { status: 400 });
  }

  const sizeUnit = unit === 'mm' ? 'mm' : 'in';

  try {
    const { db, tables } = await getDatabase();
    const id = crypto.randomUUID();
    await db.insert(tables.labelSizes).values({
      id,
      name,
      widthDots,
      heightDots,
      unit: sizeUnit,
      dpi,
      createdAt: new Date(),
    });

    return NextResponse.json({ id, name, widthDots, heightDots, unit: sizeUnit, dpi }, { status: 201 });
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

  const { id, name, widthDots, heightDots, unit, dpi } = body as {
    id?: string;
    name?: string;
    widthDots?: number;
    heightDots?: number;
    unit?: string;
    dpi?: number;
  };

  if (!id || !name || !widthDots || !heightDots || !dpi) {
    return NextResponse.json({ error: 'id, name, widthDots, heightDots, and dpi are required' }, { status: 400 });
  }

  if (![203, 300, 600].includes(dpi)) {
    return NextResponse.json({ error: 'dpi must be 203, 300, or 600' }, { status: 400 });
  }

  const sizeUnit = unit === 'mm' ? 'mm' : 'in';

  try {
    const { db, tables } = await getDatabase();
    await db.update(tables.labelSizes)
      .set({ name, widthDots, heightDots, unit: sizeUnit, dpi })
      .where(eq(tables.labelSizes.id, id));
    return NextResponse.json({ id, name, widthDots, heightDots, unit: sizeUnit, dpi });
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
