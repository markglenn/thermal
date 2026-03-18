import { describe, it, expect } from 'vitest';
import { computeQrCodeSize } from './compute-size';
import type { QrCodeProperties } from '@/lib/types';

function makeQrProps(overrides: Partial<QrCodeProperties> = {}): QrCodeProperties {
  return {
    content: 'Hello',
    magnification: 4,
    errorCorrection: 'M',
    ...overrides,
  };
}

describe('computeQrCodeSize', () => {
  it('computes size for small content (version 1)', () => {
    // "Hi" = 2 bytes, EC level M capacity for v1 = 14 → version 1
    // moduleCount = 17 + 4*1 = 21
    // size = 21 * 4 = 84
    const size = computeQrCodeSize(makeQrProps({ content: 'Hi', magnification: 4, errorCorrection: 'M' }));
    expect(size).toEqual({ width: 84, height: 94 }); // 84 + 10 gap
  });

  it('selects higher version for larger content', () => {
    // 30 bytes at EC M: v1=14, v2=26, v3=42 → version 3
    const content = 'A'.repeat(30);
    const size = computeQrCodeSize(makeQrProps({ content, magnification: 4, errorCorrection: 'M' }));
    // version 3: moduleCount = 17 + 12 = 29, size = 29 * 4 = 116
    expect(size).toEqual({ width: 116, height: 126 });
  });

  it('uses different versions for different EC levels', () => {
    // 15 bytes: L=v1(17), M=v2(26), Q=v2(20), H=v3(24)
    const content = 'A'.repeat(15);

    const sizeL = computeQrCodeSize(makeQrProps({ content, errorCorrection: 'L', magnification: 1 }));
    const sizeH = computeQrCodeSize(makeQrProps({ content, errorCorrection: 'H', magnification: 1 }));

    // L → version 1: 21 modules; H → version 3: 29 modules
    expect(sizeL.width).toBe(21);
    expect(sizeH.width).toBe(29);
  });

  it('scales with magnification', () => {
    const size1 = computeQrCodeSize(makeQrProps({ content: 'Hi', magnification: 1 }));
    const size5 = computeQrCodeSize(makeQrProps({ content: 'Hi', magnification: 5 }));

    // Same version, different magnification
    // v1: moduleCount=21; mag1: 21, mag5: 105
    expect(size1.width).toBe(21);
    expect(size5.width).toBe(105);
  });

  it('height includes 10-dot gap', () => {
    const size = computeQrCodeSize(makeQrProps({ content: 'Hi', magnification: 4 }));
    // width = 84, height should be width + 10
    expect(size.height).toBe(size.width + 10);
  });

  it('handles empty content as 1 byte', () => {
    const size = computeQrCodeSize(makeQrProps({ content: '', magnification: 4, errorCorrection: 'M' }));
    // 1 byte at M → version 1, moduleCount=21, size=84
    expect(size).toEqual({ width: 84, height: 94 });
  });

  it('caps at version 40 for very large content', () => {
    const content = 'A'.repeat(5000); // exceeds all capacities
    const size = computeQrCodeSize(makeQrProps({ content, magnification: 1, errorCorrection: 'L' }));
    // version 40: moduleCount = 17 + 160 = 177
    expect(size.width).toBe(177);
    expect(size.height).toBe(187);
  });
});
