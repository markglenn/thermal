import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';
import { generateZplMerge } from '@/lib/zpl/generator-merge';
import type { LabelDocument } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data } = body as { data?: unknown };

  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: 'data must be a non-empty array' }, { status: 400 });
  }

  // Validate each entry is an object with string values
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] !== 'object' || data[i] === null || Array.isArray(data[i])) {
      return NextResponse.json({ error: `data[${i}] must be an object` }, { status: 400 });
    }
    for (const [key, val] of Object.entries(data[i] as Record<string, unknown>)) {
      if (typeof val !== 'string') {
        return NextResponse.json({ error: `data[${i}].${key} must be a string` }, { status: 400 });
      }
    }
  }

  try {
    const { id } = await params;
    const { db, tables } = await getDatabase();

    const labelRows = await db
      .select()
      .from(tables.labels)
      .where(eq(tables.labels.id, id))
      .limit(1);

    if (labelRows.length === 0) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    const versions = await db
      .select({ document: tables.labelVersions.document })
      .from(tables.labelVersions)
      .where(eq(tables.labelVersions.labelId, id))
      .orderBy(desc(tables.labelVersions.version))
      .limit(1);

    if (versions.length === 0) {
      return NextResponse.json({ error: 'No versions found' }, { status: 404 });
    }

    const doc = versions[0].document as LabelDocument;

    // Generate merged ZPL for each data entry
    const zplBlocks = await Promise.all(
      (data as Record<string, string>[]).map((fields) =>
        generateZplMerge(doc, fields)
      )
    );

    return new NextResponse(zplBlocks.join('\n'), {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (e) {
    console.error('POST /api/labels/[id]/print failed:', e);
    return NextResponse.json({ error: 'Failed to generate print data' }, { status: 500 });
  }
}
