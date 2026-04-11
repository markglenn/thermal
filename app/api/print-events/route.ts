import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDatabase } from '@/lib/db';
import { pollEvents } from '@/lib/print/events';
import { invalidateCache } from '@/lib/print/discovery';
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
  try {
    const events = await pollEvents();

    for (const event of events) {
      if (event.eventType === 'job_status') {
        await handleJobStatus(event);
      } else if (event.eventType === 'printer_change') {
        invalidateCache();
      }
    }

    return NextResponse.json({
      processed: events.length,
      events: events.map((e) => ({
        eventType: e.eventType,
        siteId: e.siteId,
        ...('jobId' in e && { jobId: e.jobId, status: e.status }),
      })),
    });
  } catch (e) {
    console.error('POST /api/print-events failed:', e);
    return NextResponse.json({ error: 'Failed to poll events' }, { status: 500 });
  }
}
