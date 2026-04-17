/**
 * End-to-end contract test for the print pipeline.
 *
 * Runs against the `thermal-print-server` local docker-compose stack
 * (ElasticMQ on :9324). Ephemeral queues named `thermal-test-{print|
 * reply}-{runId}` are created on every run and deleted on teardown.
 * Leftover queues from crashed runs are cleaned up at the start of
 * `beforeAll` by listing everything with the `thermal-test-` prefix.
 *
 * DB rows land in `thermal_test` (see setup.ts) so the dev DB is never
 * touched, and are deleted by jobId in `afterAll`.
 *
 * The whole suite is skipped gracefully if ElasticMQ isn't reachable.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  SQSClient,
  CreateQueueCommand,
  DeleteQueueCommand,
  ListQueuesCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { eq } from 'drizzle-orm';
import { executePrint } from '@/lib/print/execute';
import { pollEvents, applyJobStatus } from '@/lib/print/events';
import { getDatabase } from '@/lib/db';
import type { LabelDocument } from '@/lib/types';

// Register components so generateZpl knows about them.
import '@/lib/components';

const ELASTICMQ_ENDPOINT = process.env.AWS_ENDPOINT_SQS ?? 'http://localhost:9324';

async function isElasticMqReachable(): Promise<boolean> {
  try {
    const resp = await fetch(ELASTICMQ_ENDPOINT + '/', { method: 'GET' });
    // ElasticMQ's root returns 405 for GET but the TCP connect is enough.
    return resp.status < 500;
  } catch {
    return false;
  }
}

/**
 * ElasticMQ returns QueueUrls using the Docker-internal hostname
 * (e.g. http://elasticmq:9324/...). The code-under-test uses these URLs
 * directly for raw HTTP calls via sqs-query.ts, so from the host we
 * have to rewrite them to the reachable endpoint before setting env
 * vars or sending messages.
 */
function toLocalQueueUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const local = new URL(ELASTICMQ_ENDPOINT);
    parsed.protocol = local.protocol;
    parsed.hostname = local.hostname;
    parsed.port = local.port;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

const reachable = await isElasticMqReachable();
if (!reachable) {
  console.warn(`[integration] ElasticMQ not reachable at ${ELASTICMQ_ENDPOINT} — skipping suite`);
}

function makeMinimalDoc(): LabelDocument {
  return {
    version: 1,
    label: {
      dpi: 203,
      variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }],
    },
    components: [{
      id: 't1',
      name: 'Text',
      layout: {
        x: 10, y: 20, width: 100, height: 30,
        horizontalAnchor: 'left', verticalAnchor: 'top',
      },
      typeData: {
        type: 'text',
        props: {
          content: 'Hello',
          font: '0',
          fontSize: 30,
          fontWidth: 25,
          rotation: 0,
        },
      },
    }],
  };
}

describe.skipIf(!reachable)('print flow integration', () => {
  const runId = crypto.randomUUID().slice(0, 8);
  let sqs: SQSClient;
  let printQueueUrl: string;
  let replyQueueUrl: string;
  const createdJobIds: string[] = [];

  beforeAll(async () => {
    sqs = new SQSClient({ endpoint: ELASTICMQ_ENDPOINT, forcePathStyle: true });

    // Clean up stale thermal-test-* queues from previously crashed runs.
    const stale = await sqs.send(new ListQueuesCommand({ QueueNamePrefix: 'thermal-test-' }));
    for (const url of stale.QueueUrls ?? []) {
      try {
        await sqs.send(new DeleteQueueCommand({ QueueUrl: toLocalQueueUrl(url) }));
      } catch {
        // best-effort; if some other run owns it, leave it alone
      }
    }

    // Create fresh ephemeral queues for this run.
    const printResp = await sqs.send(new CreateQueueCommand({ QueueName: `thermal-test-print-${runId}` }));
    const replyResp = await sqs.send(new CreateQueueCommand({ QueueName: `thermal-test-reply-${runId}` }));
    printQueueUrl = toLocalQueueUrl(printResp.QueueUrl!);
    replyQueueUrl = toLocalQueueUrl(replyResp.QueueUrl!);

    // Point the code under test at these queues.
    process.env.PRINT_QUEUE_URL = printQueueUrl;
    process.env.THERMAL_REPLY_QUEUE_URL = replyQueueUrl;
  });

  afterAll(async () => {
    if (sqs) {
      try { await sqs.send(new DeleteQueueCommand({ QueueUrl: printQueueUrl })); } catch { /* noop */ }
      try { await sqs.send(new DeleteQueueCommand({ QueueUrl: replyQueueUrl })); } catch { /* noop */ }
    }

    if (createdJobIds.length > 0) {
      const { db, tables } = await getDatabase();
      for (const id of createdJobIds) {
        try {
          await db.delete(tables.printJobs).where(eq(tables.printJobs.id, id));
        } catch { /* noop */ }
      }
    }
  });

  it('dispatches a well-formed print job to the SQS request queue', async () => {
    const doc = makeMinimalDoc();
    const result = await executePrint({
      doc,
      data: [{}],
      printer: 'test-printer',
      copies: 1,
      labelName: 'integration-test-label',
    });
    createdJobIds.push(result.jobId);

    const received = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: printQueueUrl,
      WaitTimeSeconds: 2,
      MaxNumberOfMessages: 1,
    }));

    expect(received.Messages).toBeDefined();
    expect(received.Messages).toHaveLength(1);

    const body = JSON.parse(received.Messages![0].Body!);
    expect(body.jobId).toBe(result.jobId);
    expect(body.replyToQueueUrl).toBe(replyQueueUrl);
    expect(body.printer).toBe('test-printer');
    expect(body.copies).toBe(1);
    expect(body.contentType).toBe('application/vnd.zebra.zpl');
    expect(body.chunkIndex).toBe(0);
    expect(body.totalChunks).toBe(1);
    expect(body.metadata).toBeDefined();
    expect(body.metadata.labelName).toBe('integration-test-label');
    expect(body.data).toContain('^XA');
    expect(body.data).toContain('^FDHello^FS');
    expect(body.data).toContain('^XZ');
  });

  it('applies a job_status reply and flips the printJobs row', async () => {
    const doc = makeMinimalDoc();
    const result = await executePrint({
      doc,
      data: [{}],
      printer: 'test-printer',
      copies: 1,
    });
    createdJobIds.push(result.jobId);

    // Drain the outbound message — we're focused on the reply path here.
    await sqs.send(new ReceiveMessageCommand({
      QueueUrl: printQueueUrl,
      WaitTimeSeconds: 2,
      MaxNumberOfMessages: 10,
    }));

    // Simulate what thermal-print-server would post on completion.
    const reply = {
      eventType: 'job_status',
      siteId: 'test-site',
      jobId: result.jobId,
      status: 'completed',
      printer: 'test-printer',
      error: null,
      timestamp: new Date().toISOString(),
    };
    await sqs.send(new SendMessageCommand({
      QueueUrl: replyQueueUrl,
      MessageBody: JSON.stringify(reply),
    }));

    // pollEvents pulls from THERMAL_REPLY_QUEUE_URL.
    const events = await pollEvents(10, 2);
    expect(events.map((e) => e.jobId)).toContain(result.jobId);
    const event = events.find((e) => e.jobId === result.jobId)!;
    expect(event.status).toBe('completed');

    await applyJobStatus(event);

    const { db, tables } = await getDatabase();
    const rows = await db
      .select()
      .from(tables.printJobs)
      .where(eq(tables.printJobs.id, result.jobId));

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('completed');
    expect(rows[0].completedAt).toBeInstanceOf(Date);
    expect(rows[0].error).toBeNull();
  });
});
