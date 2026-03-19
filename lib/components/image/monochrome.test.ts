import { describe, it, expect } from 'vitest';
import { grayscale, applyThreshold, applyFloydSteinberg, pixelsToHex, convertPixelsToMonochrome, type PixelData } from './monochrome';

/** Create a 2x2 RGBA pixel buffer */
function makePixels(pixels: [number, number, number, number][]): PixelData {
  const size = Math.sqrt(pixels.length);
  const data = new Uint8ClampedArray(pixels.flat());
  return { data, width: size, height: size };
}

describe('grayscale', () => {
  it('returns 0 for black', () => {
    expect(grayscale(0, 0, 0)).toBe(0);
  });

  it('returns ~255 for white', () => {
    expect(Math.round(grayscale(255, 255, 255))).toBe(255);
  });

  it('weights green highest', () => {
    expect(grayscale(0, 255, 0)).toBeGreaterThan(grayscale(255, 0, 0));
    expect(grayscale(0, 255, 0)).toBeGreaterThan(grayscale(0, 0, 255));
  });
});

describe('applyThreshold', () => {
  it('marks dark pixels as black', () => {
    // 2x2: black, white, white, black
    const pd = makePixels([
      [0, 0, 0, 255],     // black
      [255, 255, 255, 255], // white
      [255, 255, 255, 255], // white
      [0, 0, 0, 255],     // black
    ]);
    const result = applyThreshold(pd, 128, false);
    expect(result).toEqual([true, false, false, true]);
  });

  it('inverts when invert=true', () => {
    const pd = makePixels([
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
    ]);
    const result = applyThreshold(pd, 128, true);
    expect(result).toEqual([false, true, true, false]);
  });

  it('treats transparent pixels as white', () => {
    const pd = makePixels([
      [0, 0, 0, 0], // transparent — should be white (false)
    ]);
    const result = applyThreshold({ ...pd, width: 1, height: 1 }, 128, false);
    expect(result).toEqual([false]);
  });
});

describe('applyFloydSteinberg', () => {
  it('returns correct length', () => {
    const pd = makePixels([
      [0, 0, 0, 255],
      [128, 128, 128, 255],
      [200, 200, 200, 255],
      [255, 255, 255, 255],
    ]);
    const result = applyFloydSteinberg(pd, 128, false);
    expect(result).toHaveLength(4);
  });
});

describe('pixelsToHex', () => {
  it('encodes all-black 8px row as FF', () => {
    const pixels = Array(8).fill(true);
    const { hex, bytesPerRow } = pixelsToHex(pixels, 8, 1);
    expect(bytesPerRow).toBe(1);
    expect(hex).toBe('FF');
  });

  it('encodes all-white 8px row as 00', () => {
    const pixels = Array(8).fill(false);
    const { hex } = pixelsToHex(pixels, 8, 1);
    expect(hex).toBe('00');
  });

  it('pads partial bytes', () => {
    // 3px wide: true, false, true → 10100000 → A0
    const pixels = [true, false, true];
    const { hex, bytesPerRow } = pixelsToHex(pixels, 3, 1);
    expect(bytesPerRow).toBe(1);
    expect(hex).toBe('A0');
  });
});

describe('convertPixelsToMonochrome', () => {
  it('works with threshold method', () => {
    const pd = makePixels([
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
    ]);
    const result = convertPixelsToMonochrome(pd, 128, false, 'threshold');
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.bytesPerRow).toBe(1);
    expect(result.hex).toHaveLength(4); // 1 byte per row × 2 rows × 2 hex chars per byte
  });

  it('works with dither method', () => {
    const pd = makePixels([
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
    ]);
    const result = convertPixelsToMonochrome(pd, 128, false, 'dither');
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.hex.length).toBeGreaterThan(0);
  });
});
