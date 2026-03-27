import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db, tables } = await getDatabase();

    const rows = await db
      .select()
      .from(tables.printJobs)
      .where(eq(tables.printJobs.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Print job not found' }, { status: 404 });
    }

    const j = rows[0];
    return NextResponse.json({
      id: j.id,
      labelId: j.labelId,
      labelVersion: j.labelVersion,
      printer: j.printer,
      status: j.status,
      copies: j.copies,
      totalChunks: j.totalChunks,
      createdAt: j.createdAt.toISOString(),
    });
  } catch (e) {
    console.error('GET /api/print-jobs/[id] failed:', e);
    return NextResponse.json({ error: 'Failed to get print job' }, { status: 500 });
  }
}
