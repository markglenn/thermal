import { describe, it, expect } from 'vitest';
import { labelWidthDots, labelHeightDots } from './constants';

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
