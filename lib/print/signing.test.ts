import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signChunk, verifyChunk } from './signing';

const TEST_SECRET = 'test-secret-key-for-unit-tests-minimum-32-chars';

describe('print job signing', () => {
  beforeEach(() => {
    process.env.PRINT_SIGNING_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.PRINT_SIGNING_SECRET;
  });

  it('produces a hex string signature', () => {
    const sig = signChunk('job-1', 0, '^XA^XZ');
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent signatures for the same input', () => {
    const sig1 = signChunk('job-1', 0, '^XA^XZ');
    const sig2 = signChunk('job-1', 0, '^XA^XZ');
    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different job IDs', () => {
    const sig1 = signChunk('job-1', 0, '^XA^XZ');
    const sig2 = signChunk('job-2', 0, '^XA^XZ');
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different chunk indices', () => {
    const sig1 = signChunk('job-1', 0, '^XA^XZ');
    const sig2 = signChunk('job-1', 1, '^XA^XZ');
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different ZPL', () => {
    const sig1 = signChunk('job-1', 0, '^XA^FDHello^FS^XZ');
    const sig2 = signChunk('job-1', 0, '^XA^FDWorld^FS^XZ');
    expect(sig1).not.toBe(sig2);
  });

  it('verifies a valid signature', () => {
    const sig = signChunk('job-1', 0, '^XA^XZ');
    expect(verifyChunk('job-1', 0, '^XA^XZ', sig)).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const sig = signChunk('job-1', 0, '^XA^XZ');
    const tampered = sig.slice(0, -1) + (sig.at(-1) === '0' ? '1' : '0');
    expect(verifyChunk('job-1', 0, '^XA^XZ', tampered)).toBe(false);
  });

  it('rejects a signature with wrong job ID', () => {
    const sig = signChunk('job-1', 0, '^XA^XZ');
    expect(verifyChunk('job-2', 0, '^XA^XZ', sig)).toBe(false);
  });

  it('rejects a signature with wrong ZPL', () => {
    const sig = signChunk('job-1', 0, '^XA^XZ');
    expect(verifyChunk('job-1', 0, '^XA^FDtampered^FS^XZ', sig)).toBe(false);
  });

  it('throws when PRINT_SIGNING_SECRET is not set', () => {
    delete process.env.PRINT_SIGNING_SECRET;
    expect(() => signChunk('job-1', 0, '^XA^XZ')).toThrow('PRINT_SIGNING_SECRET');
  });
});
