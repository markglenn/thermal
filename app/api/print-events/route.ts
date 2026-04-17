import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';
import { pollEvents } from '@/lib/print/events';
import { requireRole, isAuthError } from '@/lib/auth/require-role';
import { logger } from '@/lib/logger';
import type { JobStatusEvent } from '@/lib/print/events';

async function handleJobStatus(event: JobStatusEvent) {
  const { db, tables } = await getDatabase();
  await db.update(tables.printJobs)
    .set({
      status: event.status,
      error: event.error,
      completedAt: new Date(event.timestamp),
    })
    .where(eq(tables.printJobs.id, event.jobId));
}

export async function POST() {
  const session = await requireRole('editor');
  if (isAuthError(session)) return session;

  try {
    const events = await pollEvents();

    for (const event of events) {
      await handleJobStatus(event);
      logger.info(
        { jobId: event.jobId, siteId: event.siteId, status: event.status, printer: event.printer },
        'print job status received',
      );
    }

    return NextResponse.json({
      processed: events.length,
      events: events.map((e) => ({
        eventType: e.eventType,
        siteId: e.siteId,
        jobId: e.jobId,
        status: e.status,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'failed to poll print-events queue');
    return NextResponse.json({ error: 'Failed to poll events' }, { status: 500 });
  }
}
