import { describe, it, expect } from 'vitest';
import { labelWidthDots, labelHeightDots, clampCoord, ZPL_COORD_MIN, ZPL_COORD_MAX } from './constants';

describe('labelWidthDots', () => {
  it('calculates for 203 DPI', () => {
    expect(labelWidthDots({ widthInches: 2, heightInches: 1, dpi: 203 })).toBe(406);
  });

  it('calculates for 300 DPI', () => {
    expect(labelWidthDots({ widthInches: 4, heightInches: 6, dpi: 300 })).toBe(1200);
  });

  it('calculates for 600 DPI', () => {
    expect(labelWidthDots({ widthInches: 3, heightInches: 2, dpi: 600 })).toBe(1800);
  });
});

describe('labelHeightDots', () => {
  it('calculates for 203 DPI', () => {
    expect(labelHeightDots({ widthInches: 2, heightInches: 1, dpi: 203 })).toBe(203);
  });

  it('calculates for standard shipping label', () => {
    expect(labelHeightDots({ widthInches: 4, heightInches: 6, dpi: 203 })).toBe(1218);
  });
});

describe('clampCoord', () => {
  it('passes through values in range', () => {
    expect(clampCoord(100)).toBe(100);
    expect(clampCoord(0)).toBe(0);
    expect(clampCoord(32000)).toBe(32000);
  });

  it('clamps negative values to 0', () => {
    expect(clampCoord(-1)).toBe(ZPL_COORD_MIN);
    expect(clampCoord(-10)).toBe(ZPL_COORD_MIN);
    expect(clampCoord(-999)).toBe(ZPL_COORD_MIN);
  });

  it('clamps values above 32000', () => {
    expect(clampCoord(32001)).toBe(ZPL_COORD_MAX);
    expect(clampCoord(50000)).toBe(ZPL_COORD_MAX);
  });

  it('rounds to nearest integer', () => {
    expect(clampCoord(10.4)).toBe(10);
    expect(clampCoord(10.6)).toBe(11);
    expect(clampCoord(0.4)).toBe(0);
  });

  it('rounds then clamps (negative rounding edge case)', () => {
    expect(clampCoord(-0.4)).toBe(0);
    expect(clampCoord(-0.6)).toBe(0);
  });
});
