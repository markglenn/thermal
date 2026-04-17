import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { receiveMessages as sqsQueryReceive, deleteMessage as sqsQueryDelete } from './sqs-query';
import { getSqsClient } from './sqs';
import { logger } from '@/lib/logger';

const useQueryProtocol = !!process.env.AWS_ENDPOINT_SQS;

export interface JobStatusEvent {
  eventType: 'job_status';
  siteId: string;
  jobId: string;
  status: 'completed' | 'failed';
  printer: string | null;
  error: string | null;
  timestamp: string;
}

function getReplyQueueUrl(): string {
  const url = process.env.THERMAL_REPLY_QUEUE_URL;
  if (!url) throw new Error('THERMAL_REPLY_QUEUE_URL environment variable is not set');
  return url;
}

function parseJobStatus(raw: string): JobStatusEvent | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.eventType !== 'job_status') {
      logger.warn({ eventType: parsed.eventType }, 'reply queue received unexpected event type');
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
