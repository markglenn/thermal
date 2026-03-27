import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { db, tables } = await getDatabase();

    const labelId = request.nextUrl.searchParams.get('labelId');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 200);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10) || 0;

    const query = db
      .select()
      .from(tables.printJobs)
      .orderBy(desc(tables.printJobs.createdAt))
      .limit(limit)
      .offset(offset);

    const jobs = labelId
      ? await query.where(eq(tables.printJobs.labelId, labelId))
      : await query;

    return NextResponse.json(
      jobs.map((j) => ({
        id: j.id,
        labelId: j.labelId,
        labelVersion: j.labelVersion,
        printer: j.printer,
        status: j.status,
        copies: j.copies,
        totalChunks: j.totalChunks,
        createdAt: j.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    console.error('GET /api/print-jobs failed:', e);
    return NextResponse.json({ error: 'Failed to list print jobs' }, { status: 500 });
  }
}
