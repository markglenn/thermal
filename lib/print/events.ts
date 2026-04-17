import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { eq } from 'drizzle-orm';
import { receiveMessages as sqsQueryReceive, deleteMessage as sqsQueryDelete } from './sqs-query';
import { getSqsClient } from './sqs';
import { getDatabase } from '@/lib/db';
import { logger } from '@/lib/logger';

const useQueryProtocol = !!process.env.AWS_ENDPOINT_SQS;

export interface JobStatusEvent {
  eventType: 'job_status';
  siteId: string;
  jobId: string;
  status: 'completed' | 'failed';
  /**
   * Optional finer-grained state from the print server (e.g. 'canceled',
   * 'blocked'). `status` always collapses these to 'completed' | 'failed'
   * for backwards compatibility; clients that want the precise state read
   * `terminalState`.
   */
  terminalState?: string;
  printer: string | null;
  error: string | null;
  timestamp: string;
}

function getReplyQueueUrl(): string {
  const url = process.env.THERMAL_REPLY_QUEUE_URL;
  if (!url) throw new Error('THERMAL_REPLY_QUEUE_URL environment variable is not set');
  return url;
}

/**
 * Apply a job_status event to the DB — flipping the matching printJobs
 * row to the event's status. Used by the API route and by integration
 * tests.
 */
export async function applyJobStatus(event: JobStatusEvent): Promise<void> {
  const { db, tables } = await getDatabase();
  await db.update(tables.printJobs)
    .set({
      // Coerce any unexpected status to 'failed' so a future server-side
      // status value (e.g. a new terminal bucket) can't strand the UI in
      // 'queued'. `parseJobStatus` already filters empty/invalid shapes.
      status: event.status === 'completed' ? 'completed' : 'failed',
      error: event.error,
      completedAt: new Date(event.timestamp),
    })
    .where(eq(tables.printJobs.id, event.jobId));
}

function parseJobStatus(raw: string): JobStatusEvent | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.eventType !== 'job_status') {
      logger.warn({ eventType: parsed.eventType }, 'reply queue received unexpected event type');
      return null;
    }
    if (typeof parsed.jobId !== 'string' || typeof parsed.status !== 'string') {
      logger.warn({ parsed }, 'reply queue message missing jobId/status');
      return null;
    }
    return parsed as JobStatusEvent;
  } catch (err) {
    logger.warn({ err, rawPreview: raw.slice(0, 200) }, 'failed to parse reply queue message');
    return null;
  }
}

/**
 * Poll the reply queue for job_status messages.
 * Returns up to `maxMessages` events and deletes them from the queue.
 */
export async function pollEvents(maxMessages = 10, waitTimeSeconds = 20): Promise<JobStatusEvent[]> {
  const queueUrl = getReplyQueueUrl();

  if (useQueryProtocol) {
    const messages = await sqsQueryReceive(queueUrl, maxMessages, waitTimeSeconds);
    const events: JobStatusEvent[] = [];
    for (const msg of messages) {
      const event = parseJobStatus(msg.body);
      if (event) events.push(event);
      await sqsQueryDelete(queueUrl, msg.receiptHandle);
    }
    return events;
  }

  const sqs = getSqsClient();
  const result = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: waitTimeSeconds,
  }));

  const messages = result.Messages ?? [];
  const events: JobStatusEvent[] = [];

  for (const msg of messages) {
    if (!msg.Body || !msg.ReceiptHandle) continue;

    const event = parseJobStatus(msg.Body);
    if (event) events.push(event);

    await sqs.send(new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: msg.ReceiptHandle,
    }));
  }

  return events;
}
