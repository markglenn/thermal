import { describe, it, expect } from 'vitest';
import { INLINE_THRESHOLD } from './sqs';
import type { PrintJobMessage } from './types';

const metadata = {
  labelId: 'label-1',
  labelVersion: 1,
  labelName: 'Test Label',
  labelSize: '4x6',
  dpmm: '8dpmm',
};

describe('PrintJobMessage — inline path', () => {
  it('small data produces inline message with data field', () => {
    const data = '^XA\n^FDHello^FS\n^XZ';

    const message: PrintJobMessage = {
      jobId: 'job-1',
      chunkIndex: 0,
      totalChunks: 1,
      printer: 'printer-1',
      contentType: 'application/vnd.zebra.zpl',
      copies: 1,
      replyToQueueUrl: 'https://sqs.test/thermal-replies-dev',
      data,
      metadata,
    };

    expect(message.s3Key).toBeUndefined();
    expect(message.data).toBe(data);
    expect(message.chunkIndex).toBe(0);
    expect(message.totalChunks).toBe(1);
    expect(message.contentType).toBe('application/vnd.zebra.zpl');
    expect(message.replyToQueueUrl).toBe('https://sqs.test/thermal-replies-dev');
    expect(JSON.stringify(message).length).toBeLessThan(1000);
  });
});

describe('PrintJobMessage — S3 path', () => {
  it('large data produces S3 message with s3Key field', () => {
    const s3Key = 'print-jobs/job-big.zpl.gz';

    const message: PrintJobMessage = {
      jobId: 'job-big',
      chunkIndex: 0,
      totalChunks: 1,
      printer: 'printer-1',
      contentType: 'application/vnd.zebra.zpl',
      copies: 1,
      replyToQueueUrl: 'https://sqs.test/thermal-replies-dev',
      s3Key,
      metadata,
    };

    expect(message.data).toBeUndefined();
    expect(message.s3Key).toBe(s3Key);
    expect(message.replyToQueueUrl).toBe('https://sqs.test/thermal-replies-dev');
    expect(JSON.stringify(message).length).toBeLessThan(500);
  });
});

describe('inline threshold', () => {
  it('is 200 KB', () => {
    expect(INLINE_THRESHOLD).toBe(200 * 1024);
  });

  it('typical label ZPL is well under the threshold', () => {
    const zpl = '^XA\n^PW812\n^LL812\n^FO10,10\n^A0N,30,30\n^FDHello World^FS\n^XZ';
    expect(Buffer.byteLength(zpl, 'utf-8')).toBeLessThan(INLINE_THRESHOLD);
  });

  it('label with large GFA image exceeds the threshold', () => {
    const hexData = 'FF'.repeat(150_000);
    const zpl = `^XA\n^GFA,150000,150000,38,${hexData}\n^XZ`;
    expect(Buffer.byteLength(zpl, 'utf-8')).toBeGreaterThan(INLINE_THRESHOLD);
  });
});

describe('compression for S3 path', () => {
  it('gzip significantly reduces size for image-heavy labels', async () => {
    const { compressData } = await import('./compress');
    const hexData = '0'.repeat(5000) + 'FF'.repeat(500) + 'AA'.repeat(1000);
    const zpl = `^XA\n^GFA,4000,4000,38,${hexData}\n^FO10,10\n^FDHello^FS\n^XZ`;

    const compressed = compressData(zpl);
    expect(compressed.length).toBeLessThan(Buffer.byteLength(zpl, 'utf-8') * 0.5);
  });
});
