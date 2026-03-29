import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signJob, verifyJob } from './signing';

const TEST_SECRET = 'test-secret-key-for-unit-tests-minimum-32-chars';

describe('print job signing', () => {
  beforeEach(() => {
    process.env.PRINT_SIGNING_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.PRINT_SIGNING_SECRET;
  });

  it('produces a hex string signature', () => {
    const sig = signJob('job-1', 'print-jobs/job-1.zpl.gz');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent signatures for the same input', () => {
    const sig1 = signJob('job-1', 'print-jobs/job-1.zpl.gz');
    const sig2 = signJob('job-1', 'print-jobs/job-1.zpl.gz');
    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different job IDs', () => {
    const sig1 = signJob('job-1', 'print-jobs/job-1.zpl.gz');
    const sig2 = signJob('job-2', 'print-jobs/job-2.zpl.gz');
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different S3 keys', () => {
    const sig1 = signJob('job-1', 'print-jobs/job-1.zpl.gz');
    const sig2 = signJob('job-1', 'print-jobs/job-1-v2.zpl.gz');
    expect(sig1).not.toBe(sig2);
  });

  it('verifies a valid signature', () => {
    const sig = signJob('job-1', 'print-jobs/job-1.zpl.gz');
    expect(verifyJob('job-1', 'print-jobs/job-1.zpl.gz', sig)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const sig = signJob('job-1', 'print-jobs/job-1.zpl.gz');
    const tampered = sig.slice(0, -1) + (sig.at(-1) === '0' ? '1' : '0');
    expect(verifyJob('job-1', 'print-jobs/job-1.zpl.gz', tampered)).toBe(false);
  });

  it('rejects a signature with wrong job ID', () => {
    const sig = signJob('job-1', 'print-jobs/job-1.zpl.gz');
    expect(verifyJob('job-2', 'print-jobs/job-1.zpl.gz', sig)).toBe(false);
  });

  it('throws when PRINT_SIGNING_SECRET is not set', () => {
    delete process.env.PRINT_SIGNING_SECRET;
    expect(() => signJob('job-1', 'print-jobs/job-1.zpl.gz')).toThrow('PRINT_SIGNING_SECRET');
  });
});
