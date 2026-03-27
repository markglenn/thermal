import { describe, it, expect, beforeEach } from 'vitest';
import { chunkZplBlocks } from './sqs';

const metadata = { labelId: 'label-1', labelVersion: 1, labelName: 'Test Label' };

describe('chunkZplBlocks', () => {
  beforeEach(() => {
    process.env.PRINT_SIGNING_SECRET = 'test-secret-key-for-unit-tests-minimum-32-chars';
  });

  it('puts all blocks in one chunk when they fit', () => {
    const blocks = ['^XA^FDHello^FS^XZ', '^XA^FDWorld^FS^XZ'];
    const chunks = chunkZplBlocks(blocks, 'job-1', 'printer-1', 1, metadata);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('^XA^FDHello^FS^XZ\n^XA^FDWorld^FS^XZ');
  });

  it('returns empty array for no blocks', () => {
    const chunks = chunkZplBlocks([], 'job-1', 'printer-1', 1, metadata);
    expect(chunks).toHaveLength(0);
  });

  it('splits blocks when they exceed the size limit', () => {
    // Create blocks that are ~100KB each — should need multiple chunks at 240KB limit
    const largeBlock = '^XA^FD' + 'A'.repeat(100_000) + '^FS^XZ';
    const blocks = [largeBlock, largeBlock, largeBlock];
    const chunks = chunkZplBlocks(blocks, 'job-1', 'printer-1', 1, metadata);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should contain at least one block
    for (const chunk of chunks) {
      expect(chunk).toContain('^XA');
      expect(chunk).toContain('^XZ');
    }
  });

  it('handles a single oversized block', () => {
    const hugeBlock = '^XA^FD' + 'A'.repeat(300_000) + '^FS^XZ';
    const chunks = chunkZplBlocks([hugeBlock], 'job-1', 'printer-1', 1, metadata);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(hugeBlock);
  });

  it('preserves all blocks across chunks', () => {
    const largeBlock = '^XA^FD' + 'A'.repeat(80_000) + '^FS^XZ';
    const blocks = Array.from({ length: 10 }, (_, i) => largeBlock + i);
    const chunks = chunkZplBlocks(blocks, 'job-1', 'printer-1', 1, metadata);

    // Rejoin all chunks and split by the blocks to verify nothing was lost
    const allZpl = chunks.join('\n');
    for (const block of blocks) {
      expect(allZpl).toContain(block);
    }
  });

  it('handles many small blocks in one chunk', () => {
    const blocks = Array.from({ length: 500 }, (_, i) => `^XA^FD${i}^FS^XZ`);
    const chunks = chunkZplBlocks(blocks, 'job-1', 'printer-1', 1, metadata);
    // 500 tiny blocks should fit in one chunk
    expect(chunks).toHaveLength(1);
    expect(chunks[0].split('\n')).toHaveLength(500);
  });
});
