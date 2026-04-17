import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth/require-role';

// A queued job with no reply after this long is treated as stuck. The
// server lazily flips it to `failed` on the next GET so stranded jobs
// don't poll forever and so reopening the dialog surfaces the truth.
const JOB_TIMEOUT_MS = 5 * 60_000;
const JOB_TIMEOUT_ERROR = 'Print server did not respond within 5 minutes.';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireRole('viewer');
  if (isAuthError(session)) return session;

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

    let j = rows[0];

    if (j.status === 'queued' && Date.now() - j.createdAt.getTime() > JOB_TIMEOUT_MS) {
      const now = new Date();
      // Conditional update: only flip rows that are still queued, so we
      // don't race a legitimate job_status reply that landed in parallel.
      await db
        .update(tables.printJobs)
        .set({ status: 'failed', error: JOB_TIMEOUT_ERROR, completedAt: now })
        .where(and(eq(tables.printJobs.id, id), eq(tables.printJobs.status, 'queued')));
      j = { ...j, status: 'failed', error: JOB_TIMEOUT_ERROR, completedAt: now };
    }

    return NextResponse.json({
      id: j.id,
      labelId: j.labelId,
      labelVersion: j.labelVersion,
      siteId: j.siteId,
      printer: j.printer,
      status: j.status,
      copies: j.copies,
      totalChunks: j.totalChunks,
      error: j.error,
      createdAt: j.createdAt.toISOString(),
      completedAt: j.completedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error('GET /api/print-jobs/[id] failed:', e);
    return NextResponse.json({ error: 'Failed to get print job' }, { status: 500 });
  }
}
