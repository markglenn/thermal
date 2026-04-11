import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { receiveMessages as sqsQueryReceive, deleteMessage as sqsQueryDelete } from './sqs-query';
import { getSqsClient } from './sqs';

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

export interface PrinterChangeEvent {
  eventType: 'printer_change';
  siteId: string;
  printers: unknown[];
  timestamp: string;
}

export interface HeartbeatEvent {
  eventType: 'heartbeat';
  siteId: string;
  printerCount: number;
  uptimeSeconds: number;
  timestamp: string;
}

export type PrintEvent = JobStatusEvent | PrinterChangeEvent | HeartbeatEvent;

function getResponseQueueUrl(): string {
  const url = process.env.RESPONSE_QUEUE_URL;
  if (!url) throw new Error('RESPONSE_QUEUE_URL environment variable is not set');
  return url;
}

function parseEventBody(raw: string): PrintEvent | null {
  try {
    let parsed = JSON.parse(raw);

    // In production, SNS wraps the message in an envelope with a "Message" field.
    // In local dev (goaws with Raw: true), the event is the message directly.
    if (typeof parsed.Message === 'string') {
      parsed = JSON.parse(parsed.Message);
    }

    if (!parsed.eventType) return null;
    return parsed as PrintEvent;
  } catch {
    return null;
  }
}

/**
 * Poll the response queue for print events.
 * Returns up to `maxMessages` events and deletes them from the queue.
 */
export async function pollEvents(maxMessages = 10): Promise<PrintEvent[]> {
  const queueUrl = getResponseQueueUrl();

  if (useQueryProtocol) {
    const messages = await sqsQueryReceive(queueUrl, maxMessages, 1);
    const events: PrintEvent[] = [];
    for (const msg of messages) {
      const event = parseEventBody(msg.body);
      if (event) events.push(event);
      await sqsQueryDelete(queueUrl, msg.receiptHandle);
    }
    return events;
  }

  const sqs = getSqsClient();
  const result = await sqs.send(new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: 1,
  }));

  const messages = result.Messages ?? [];
  const events: PrintEvent[] = [];

  for (const msg of messages) {
    if (!msg.Body || !msg.ReceiptHandle) continue;

    const event = parseEventBody(msg.Body);
    if (event) events.push(event);

    await sqs.send(new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: msg.ReceiptHandle,
    }));
  }

  return events;
}
