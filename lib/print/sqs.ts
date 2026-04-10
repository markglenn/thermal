import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { compressData } from './compress';
import type { PrintJobMessage, PrintJobMessageMetadata } from './types';

// Inline threshold: raw data under this size is sent directly in the SQS
// message. Above this, it's gzipped and uploaded to S3. 200 KB leaves
// headroom within SQS's 256 KB limit after the JSON envelope.
const INLINE_THRESHOLD_BYTES = 200 * 1024;

let _sqsClient: SQSClient | null = null;
let _s3Client: S3Client | null = null;

function getSqsClient(): SQSClient {
  if (!_sqsClient) {
    _sqsClient = new SQSClient({});
  }
  return _sqsClient;
}

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({});
  }
  return _s3Client;
}

function getQueueUrl(): string {
  const url = process.env.PRINT_QUEUE_URL;
  if (!url) throw new Error('PRINT_QUEUE_URL environment variable is not set');
  return url;
}

function getBucket(): string {
  const bucket = process.env.PRINT_BUCKET;
  if (!bucket) throw new Error('PRINT_BUCKET environment variable is not set');
  return bucket;
}

/**
 * Publish a print job.
 *
 * Small jobs (< 200 KB raw): data inline in the SQS message.
 * Large jobs (≥ 200 KB raw): gzip to S3, send pointer via SQS.
 *
 * The print server checks for `s3Key` — if present, fetch from S3 and gunzip.
 * Otherwise, use `data` directly.
 */
export async function publishPrintJob(
  jobId: string,
  data: string,
  printer: string,
  copies: number,
  contentType: string,
  metadata: PrintJobMessageMetadata
): Promise<void> {
  const rawSize = Buffer.byteLength(data, 'utf-8');

  let message: PrintJobMessage;

  if (rawSize < INLINE_THRESHOLD_BYTES) {
    // Inline: data directly in the message
    message = { jobId, chunkIndex: 0, totalChunks: 1, printer, contentType, copies, data, metadata };
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
    message = { jobId, chunkIndex: 0, totalChunks: 1, printer, contentType, copies, s3Key, metadata };
  }

  await getSqsClient().send(new SendMessageCommand({
    QueueUrl: getQueueUrl(),
    MessageBody: JSON.stringify(message),
  }));
}

/** Exported for tests. */
export const INLINE_THRESHOLD = INLINE_THRESHOLD_BYTES;

/** Reset clients — for tests only. */
export function resetClients() {
  _sqsClient = null;
  _s3Client = null;
}
