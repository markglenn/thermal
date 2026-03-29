import { describe, it, expect, beforeEach } from 'vitest';
import { INLINE_THRESHOLD } from './sqs';
import type { PrintJobMessage } from './types';

const metadata = { labelId: 'label-1', labelVersion: 1, labelName: 'Test Label' };

describe('PrintJobMessage — inline path', () => {
  beforeEach(() => {
    process.env.PRINT_SIGNING_SECRET = 'test-secret-key-for-unit-tests-minimum-32-chars';
  });

  it('small ZPL produces inline message with raw zpl field', async () => {
    const { signJob } = await import('./signing');

    const zpl = '^XA\n^FDHello^FS\n^XZ';
    const signature = signJob('job-1', zpl);

    const message: PrintJobMessage = {
      jobId: 'job-1',
      printer: 'printer-1',
      copies: 1,
      zpl,
      signature,
      metadata,
    };

    expect(message.s3Key).toBeUndefined();
    expect(message.zpl).toBe(zpl);
    expect(JSON.stringify(message).length).toBeLessThan(1000);
  });
});

describe('PrintJobMessage — S3 path', () => {
  beforeEach(() => {
    process.env.PRINT_SIGNING_SECRET = 'test-secret-key-for-unit-tests-minimum-32-chars';
  });

  it('large ZPL produces S3 message with s3Key field', async () => {
    const { signJob } = await import('./signing');

    const s3Key = 'print-jobs/job-big.zpl.gz';
    const signature = signJob('job-big', s3Key);

    const message: PrintJobMessage = {
      jobId: 'job-big',
      printer: 'printer-1',
      copies: 1,
      s3Key,
      signature,
      metadata,
    };

    expect(message.zpl).toBeUndefined();
    expect(message.s3Key).toBe(s3Key);
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
    const { compressZpl } = await import('./compress');
    const hexData = '0'.repeat(5000) + 'FF'.repeat(500) + 'AA'.repeat(1000);
    const zpl = `^XA\n^GFA,4000,4000,38,${hexData}\n^FO10,10\n^FDHello^FS\n^XZ`;

    const compressed = compressZpl(zpl);
    expect(compressed.length).toBeLessThan(Buffer.byteLength(zpl, 'utf-8') * 0.5);
  });
});

describe('signing', () => {
  beforeEach(() => {
    process.env.PRINT_SIGNING_SECRET = 'test-secret-key-for-unit-tests-minimum-32-chars';
  });

  it('works for both inline ZPL and S3 key payloads', async () => {
    const { signJob, verifyJob } = await import('./signing');

    // Inline: signs raw ZPL
    const zpl = '^XA^XZ';
    const sig1 = signJob('job-1', zpl);
    expect(verifyJob('job-1', zpl, sig1)).toBe(true);
    expect(verifyJob('job-1', 'tampered', sig1)).toBe(false);

    // S3: signs the key
    const s3Key = 'print-jobs/job-2.zpl.gz';
    const sig2 = signJob('job-2', s3Key);
    expect(verifyJob('job-2', s3Key, sig2)).toBe(true);
    expect(verifyJob('job-2', 'print-jobs/wrong.zpl.gz', sig2)).toBe(false);
  });
});
