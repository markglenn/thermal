import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { signChunk } from './signing';
import type { PrintJobMessage, PrintJobMessageMetadata } from './types';

const MAX_MESSAGE_BYTES = 240 * 1024; // 240 KB — headroom below SQS's 256 KB limit

let _client: SQSClient | null = null;

function getClient(): SQSClient {
  if (!_client) {
    _client = new SQSClient({});
  }
  return _client;
}

function getQueueUrl(): string {
  const url = process.env.PRINT_QUEUE_URL;
  if (!url) throw new Error('PRINT_QUEUE_URL environment variable is not set');
  return url;
}

/** Build a message envelope (without ZPL) to measure the fixed overhead. */
function envelopeSize(
  jobId: string,
  chunkIndex: number,
  totalChunks: number,
  printer: string,
  copies: number,
  metadata: PrintJobMessageMetadata
): number {
  const envelope: PrintJobMessage = {
    jobId,
    chunkIndex,
    totalChunks,
    printer,
    zpl: '',
    copies,
    signature: '0'.repeat(64), // HMAC-SHA256 hex is always 64 chars
    metadata,
  };
  return Buffer.byteLength(JSON.stringify(envelope), 'utf-8');
}

/**
 * Split ZPL blocks into chunks that fit within the SQS message size limit.
 * Each block is a complete label (^XA...^XZ). Returns an array of ZPL strings,
 * where each string may contain multiple blocks joined by newlines.
 */
export function chunkZplBlocks(
  blocks: string[],
  jobId: string,
  printer: string,
  copies: number,
  metadata: PrintJobMessageMetadata
): string[] {
  if (blocks.length === 0) return [];

  const overhead = envelopeSize(jobId, 0, 1, printer, copies, metadata);
  const maxZplBytes = MAX_MESSAGE_BYTES - overhead;

  const chunks: string[] = [];
  let currentBlocks: string[] = [];
  let currentSize = 0;

  for (const block of blocks) {
    const blockSize = Buffer.byteLength(block, 'utf-8');

    // If a single block exceeds the limit, it gets its own chunk (best effort)
    if (blockSize > maxZplBytes && currentBlocks.length === 0) {
      chunks.push(block);
      continue;
    }

    // Account for the newline separator between blocks
    const separatorSize = currentBlocks.length > 0 ? 1 : 0;
    const newSize = currentSize + separatorSize + blockSize;

    if (newSize > maxZplBytes && currentBlocks.length > 0) {
      chunks.push(currentBlocks.join('\n'));
      currentBlocks = [block];
      currentSize = blockSize;
    } else {
      currentBlocks.push(block);
      currentSize = newSize;
    }
  }

  if (currentBlocks.length > 0) {
    chunks.push(currentBlocks.join('\n'));
  }

  return chunks;
}

/** Publish print job chunks to SQS. Returns the number of chunks sent. */
export async function publishPrintJob(
  jobId: string,
  zplBlocks: string[],
  printer: string,
  copies: number,
  metadata: PrintJobMessageMetadata
): Promise<number> {
  const chunks = chunkZplBlocks(zplBlocks, jobId, printer, copies, metadata);
  const totalChunks = chunks.length;
  const queueUrl = getQueueUrl();
  const client = getClient();

  for (let i = 0; i < chunks.length; i++) {
    const signature = signChunk(jobId, i, chunks[i]);

    const message: PrintJobMessage = {
      jobId,
      chunkIndex: i,
      totalChunks,
      printer,
      zpl: chunks[i],
      copies,
      signature,
      metadata,
    };

    await client.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
    }));
  }

  return totalChunks;
}

/** Reset client — for tests only. */
export function resetSqsClient() {
  _client = null;
}
