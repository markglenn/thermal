import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { sendMessage as sqsQuerySend } from './sqs-query';
import { compressData } from './compress';
import type { PrintJobMessage, PrintJobMessageMetadata } from './types';

const useQueryProtocol = !!process.env.AWS_ENDPOINT_SQS;

// Inline threshold: raw data under this size is sent directly in the SQS
// message. Above this, it's gzipped and uploaded to S3. 200 KB leaves
// headroom within SQS's 256 KB limit after the JSON envelope.
const INLINE_THRESHOLD_BYTES = 200 * 1024;

let _sqsClient: SQSClient | null = null;
let _s3Client: S3Client | null = null;

function getSqsClient(): SQSClient {
  if (!_sqsClient) {
    const endpoint = process.env.AWS_ENDPOINT_SQS;
    _sqsClient = new SQSClient({
      ...(endpoint && { endpoint, forcePathStyle: true }),
    });
  }
  return _sqsClient;
}

function getS3Client(): S3Client {
  if (!_s3Client) {
    const endpoint = process.env.AWS_ENDPOINT_S3;
    _s3Client = new S3Client({
      ...(endpoint && { endpoint, forcePathStyle: true }),
    });

    // Capture S3's response `Date` header so discovery can compute
    // clock-skew-free liveness (comparing LastModified to S3's "now").
    _s3Client.middlewareStack.add(
      (next) => async (args) => {
        const result = await next(args);
        const response = (result as { response?: { headers?: Record<string, string> } }).response;
        const headers = response?.headers ?? {};
        const output = result.output as { $metadata?: Record<string, unknown> } | undefined;
        if (output?.$metadata) {
          output.$metadata.responseDate = headers.date ?? headers.Date;
        }
        return result;
      },
      { step: 'deserialize', name: 'captureResponseDate' },
    );
  }
  return _s3Client;
}

/** Exported for use by discovery and events modules. */
export { getSqsClient, getS3Client };

function getBucket(): string {
  const bucket = process.env.PRINT_BUCKET;
  if (!bucket) throw new Error('PRINT_BUCKET environment variable is not set');
  return bucket;
}

function getReplyQueueUrl(): string {
  const url = process.env.THERMAL_REPLY_QUEUE_URL;
  if (!url) throw new Error('THERMAL_REPLY_QUEUE_URL environment variable is not set');
  return url;
}

/**
 * Publish a print job.
 *
 * Small jobs (< 200 KB raw): data inline in the SQS message.
 * Large jobs (≥ 200 KB raw): gzip to S3, send pointer via SQS.
 *
 * The print server checks for `s3Key` — if present, fetch from S3 and gunzip.
 * Otherwise, use `data` directly. On completion or failure, it posts a
 * job_status message to `replyToQueueUrl`.
 */
export async function publishPrintJob(
  jobId: string,
  data: string,
  printer: string,
  copies: number,
  contentType: string,
  metadata: PrintJobMessageMetadata,
  queueUrl?: string
): Promise<void> {
  const rawSize = Buffer.byteLength(data, 'utf-8');
  const replyToQueueUrl = getReplyQueueUrl();

  let message: PrintJobMessage;

  if (rawSize < INLINE_THRESHOLD_BYTES) {
    // Inline: data directly in the message
    message = { jobId, chunkIndex: 0, totalChunks: 1, printer, contentType, copies, replyToQueueUrl, data, metadata };
  } else {
    // S3: gzip and upload, send pointer
    const s3Key = `print-jobs/${jobId}.zpl.gz`;
    const compressed = compressData(data);
    await getS3Client().send(new PutObjectCommand({
      Bucket: getBucket(),
      Key: s3Key,
      Body: compressed,
      ContentType: 'application/gzip',
    }));
    message = { jobId, chunkIndex: 0, totalChunks: 1, printer, contentType, copies, replyToQueueUrl, s3Key, metadata };
  }

  const resolvedUrl = queueUrl || process.env.PRINT_QUEUE_URL;
  if (!resolvedUrl) throw new Error('No queue URL provided and PRINT_QUEUE_URL is not set');

  if (useQueryProtocol) {
    await sqsQuerySend(resolvedUrl, JSON.stringify(message));
  } else {
    await getSqsClient().send(new SendMessageCommand({
      QueueUrl: resolvedUrl,
      MessageBody: JSON.stringify(message),
    }));
  }
}

/** Exported for tests. */
export const INLINE_THRESHOLD = INLINE_THRESHOLD_BYTES;

/** Reset clients — for tests only. */
export function resetClients() {
  _sqsClient = null;
  _s3Client = null;
}
