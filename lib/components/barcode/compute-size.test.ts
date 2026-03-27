import { describe, it, expect } from 'vitest';
import { computeBarcodeSize } from './compute-size';
import type { BarcodeProperties } from '@/lib/types';

function makeBarcodeProps(overrides: Partial<BarcodeProperties> = {}): BarcodeProperties {
  return {
    content: '12345',
    encoding: 'code128',
    height: 100,
    showText: false,
    rotation: 0,
    ...overrides,
  };
}

describe('computeBarcodeSize', () => {
  it('computes Code128 width correctly', () => {
    // Code128B: 11 * contentLength + 35 total modules, * 2 for module width
    const props = makeBarcodeProps({ content: '12345', encoding: 'code128' });
    const size = computeBarcodeSize(props);
    const expectedModules = 11 * 5 + 35; // 90
    expect(size).toEqual({ width: expectedModules * 2, height: 100 });
  });

  it('computes Code39 width correctly', () => {
    const props = makeBarcodeProps({ content: 'ABC', encoding: 'code39' });
    const size = computeBarcodeSize(props);
    // 16 * (3 + 2 start/stop) = 80 modules
    expect(size).toEqual({ width: 80 * 2, height: 100 });
  });

  it('computes EAN-13 fixed width without text', () => {
    const props = makeBarcodeProps({ content: '5901234123457', encoding: 'ean13' });
    const size = computeBarcodeSize(props);
    expect(size).toEqual({ width: 190, height: 100 });
  });

  it('computes EAN-13 width with text (includes leading digit padding)', () => {
    const props = makeBarcodeProps({ content: '5901234123457', encoding: 'ean13', showText: true });
    const size = computeBarcodeSize(props);
    // 95 bar modules + 12 leading digit padding = 107 modules * 2
    expect(size).toEqual({ width: 214, height: 122 });
  });

  it('computes UPC-A fixed width without text', () => {
    const props = makeBarcodeProps({ content: '012345678905', encoding: 'upca' });
    const size = computeBarcodeSize(props);
    expect(size).toEqual({ width: 190, height: 100 });
  });

  it('computes UPC-A width with text (includes first/last digit padding)', () => {
    const props = makeBarcodeProps({ content: '012345678905', encoding: 'upca', showText: true });
    const size = computeBarcodeSize(props);
    // 95 bar modules + 16 first/last digit padding = 111 modules * 2
    expect(size).toEqual({ width: 222, height: 122 });
  });

  it('computes ITF width correctly', () => {
    const props = makeBarcodeProps({ content: '1234', encoding: 'itf' });
    const size = computeBarcodeSize(props);
    // 9 * 4 + 9 = 45 modules
    expect(size).toEqual({ width: 45 * 2, height: 100 });
  });

  it('returns zero width for empty content', () => {
    const props = makeBarcodeProps({ content: '' });
    const size = computeBarcodeSize(props);
    expect(size.width).toBe(0);
  });

  it('adds text height when showText is true', () => {
    const props = makeBarcodeProps({ content: '12345', showText: true, height: 100 });
    const size = computeBarcodeSize(props);
    expect(size.height).toBe(122); // 100 + 22
  });

  it('does not add text height when showText is false', () => {
    const props = makeBarcodeProps({ content: '12345', showText: false, height: 100 });
    const size = computeBarcodeSize(props);
    expect(size.height).toBe(100);
  });

  it('swaps dimensions for rotation 90', () => {
    const props = makeBarcodeProps({ content: '12345', rotation: 90, height: 100 });
    const unrotated = computeBarcodeSize({ ...props, rotation: 0 });
    const size = computeBarcodeSize(props);
    expect(size).toEqual({ width: unrotated.height, height: unrotated.width });
  });

  it('swaps dimensions for rotation 270', () => {
    const props = makeBarcodeProps({ content: '12345', rotation: 270, height: 100 });
    const unrotated = computeBarcodeSize({ ...props, rotation: 0 });
    const size = computeBarcodeSize(props);
    expect(size).toEqual({ width: unrotated.height, height: unrotated.width });
  });

  it('does not swap dimensions for rotation 180', () => {
    const props = makeBarcodeProps({ content: '12345', rotation: 180, height: 100 });
    const unrotated = computeBarcodeSize({ ...props, rotation: 0 });
    const size = computeBarcodeSize(props);
    expect(size).toEqual(unrotated);
  });
});
