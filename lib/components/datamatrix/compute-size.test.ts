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
  it('computes size for small content (20-module rendered size)', () => {
    // "Hi" = 2 bytes, capacity 3 → 20 rendered modules
    const size = computeDataMatrixSize(makeProps({ content: 'Hi', moduleSize: 4 }));
    expect(size).toEqual({ width: 80, height: 80 });
  });

  it('selects larger size for longer content', () => {
    // 10 bytes → capacity 10 → 28 rendered modules
    const size = computeDataMatrixSize(makeProps({ content: '1234567890', moduleSize: 3 }));
    expect(size).toEqual({ width: 84, height: 84 });
  });

  it('scales with module size', () => {
    const size1 = computeDataMatrixSize(makeProps({ content: 'Hi', moduleSize: 1 }));
    const size5 = computeDataMatrixSize(makeProps({ content: 'Hi', moduleSize: 5 }));
    expect(size1.width).toBe(20);
    expect(size5.width).toBe(100);
  });

  it('handles empty content as 1 byte', () => {
    const size = computeDataMatrixSize(makeProps({ content: '', moduleSize: 4 }));
    // 1 byte → capacity 3 → 20 rendered modules
    expect(size).toEqual({ width: 80, height: 80 });
  });

  it('uses largest size for very large content', () => {
    const size = computeDataMatrixSize(makeProps({ content: 'A'.repeat(2000), moduleSize: 1 }));
    // exceeds all → 144 rendered modules
    expect(size).toEqual({ width: 144, height: 144 });
  });
});
