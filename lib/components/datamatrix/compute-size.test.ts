import { describe, it, expect } from 'vitest';
import { computeDataMatrixSize } from './compute-size';
import type { DataMatrixProperties } from '@/lib/types';

function makeProps(overrides: Partial<DataMatrixProperties> = {}): DataMatrixProperties {
  return {
    content: 'Hello',
    moduleSize: 4,
    ...overrides,
  };
}

describe('computeDataMatrixSize', () => {
  it('computes size for small content', () => {
    // "Hi" = 2 codewords → capacity 3 → 10x10 symbol
    const size = computeDataMatrixSize(makeProps({ content: 'Hi', moduleSize: 4 }));
    expect(size).toEqual({ width: 40, height: 40 });
  });

  it('selects larger size for longer content', () => {
    // "1234567890" = 5 digit-pair codewords → capacity 6 → 12x12 symbol
    const size = computeDataMatrixSize(makeProps({ content: '1234567890', moduleSize: 3 }));
    expect(size).toEqual({ width: 36, height: 36 });
  });

  it('accounts for mode-switch overhead with mixed content', () => {
    // "1234567890a" = 5 digit-pairs + 1 unlatch + 1 ascii = 7 codewords → 14x14
    const size = computeDataMatrixSize(makeProps({ content: '1234567890a', moduleSize: 5 }));
    expect(size).toEqual({ width: 70, height: 70 });
  });

  it('scales with module size', () => {
    const size1 = computeDataMatrixSize(makeProps({ content: 'Hi', moduleSize: 1 }));
    const size5 = computeDataMatrixSize(makeProps({ content: 'Hi', moduleSize: 5 }));
    expect(size1.width).toBe(10);
    expect(size5.width).toBe(50);
  });

  it('handles empty content as 1 codeword', () => {
    const size = computeDataMatrixSize(makeProps({ content: '', moduleSize: 4 }));
    // 1 char → capacity 3 → 10x10 symbol
    expect(size).toEqual({ width: 40, height: 40 });
  });

  it('uses largest size for very large content', () => {
    const size = computeDataMatrixSize(makeProps({ content: 'A'.repeat(2500), moduleSize: 1 }));
    // exceeds all → 144-module symbol
    expect(size).toEqual({ width: 144, height: 144 });
  });
});
