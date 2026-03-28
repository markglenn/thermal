import { describe, it, expect } from 'vitest';
import { labelWidthDots, labelHeightDots, clampCoord, ZPL_COORD_MIN, ZPL_COORD_MAX, dotsToInches, inchesToDots, dotsToMm, mmToDots, dotsToUnit, unitToDots, getActiveVariant, migrateLabelConfig } from './constants';
import type { LabelConfig } from './types';

/** Helper to create a LabelConfig from dots values. */
function makeLabel(widthDots: number, heightDots: number, dpi: 203 | 300 | 600 = 203): LabelConfig {
  return { dpi, variants: [{ name: 'Default', widthDots, heightDots, unit: 'in' }] };
}

describe('labelWidthDots', () => {
  it('returns widthDots from the active variant', () => {
    expect(labelWidthDots(makeLabel(406, 203))).toBe(406);
  });

  it('returns widthDots for a different DPI label', () => {
    expect(labelWidthDots(makeLabel(1200, 1800, 300))).toBe(1200);
  });

  it('falls back to first variant when activeVariant is invalid', () => {
    const label: LabelConfig = {
      dpi: 203,
      variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }],
    };
    expect(labelWidthDots(label, 'missing')).toBe(406);
  });
});

describe('labelHeightDots', () => {
  it('returns heightDots from the active variant', () => {
    expect(labelHeightDots(makeLabel(406, 203))).toBe(203);
  });

  it('returns heightDots for shipping label', () => {
    expect(labelHeightDots(makeLabel(812, 1218))).toBe(1218);
  });
});

describe('getActiveVariant', () => {
  it('returns the matching variant', () => {
    const label: LabelConfig = {
      dpi: 203,
      variants: [
        { name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' },
        { name: 'UK', widthDots: 400, heightDots: 200, unit: 'mm' },
      ],
    };
    const variant = getActiveVariant(label, 'UK');
    expect(variant.name).toBe('UK');
    expect(variant.widthDots).toBe(400);
    expect(variant.unit).toBe('mm');
  });

  it('returns first variant when no activeVariant specified', () => {
    const label: LabelConfig = {
      dpi: 203,
      variants: [
        { name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' },
        { name: 'UK', widthDots: 400, heightDots: 200, unit: 'mm' },
      ],
    };
    const variant = getActiveVariant(label);
    expect(variant.name).toBe('Default');
  });
});

describe('unit conversion', () => {
  it('dotsToInches', () => {
    expect(dotsToInches(406, 203)).toBeCloseTo(2, 2);
  });

  it('inchesToDots', () => {
    expect(inchesToDots(2, 203)).toBe(406);
  });

  it('dotsToMm', () => {
    expect(dotsToMm(203, 203)).toBeCloseTo(25.4, 1);
  });

  it('mmToDots', () => {
    expect(mmToDots(25.4, 203)).toBe(203);
  });

  it('dotsToUnit for inches', () => {
    expect(dotsToUnit(406, 203, 'in')).toBeCloseTo(2, 2);
  });

  it('dotsToUnit for mm', () => {
    expect(dotsToUnit(203, 203, 'mm')).toBeCloseTo(25.4, 1);
  });

  it('unitToDots for inches', () => {
    expect(unitToDots(2, 203, 'in')).toBe(406);
  });

  it('unitToDots for mm', () => {
    expect(unitToDots(25.4, 203, 'mm')).toBe(203);
  });
});

describe('migrateLabelConfig', () => {
  it('migrates legacy widthInches/heightInches to variants', () => {
    const legacy = { widthInches: 4, heightInches: 6, dpi: 203 };
    const result = migrateLabelConfig(legacy);
    expect(result.label.dpi).toBe(203);
    expect(result.activeVariant).toBe('Default');
    expect(result.label.variants).toHaveLength(1);
    expect(result.label.variants[0].widthDots).toBe(812);
    expect(result.label.variants[0].heightDots).toBe(1218);
    expect(result.label.variants[0].unit).toBe('in');
  });

  it('passes through already-migrated config and extracts activeVariant', () => {
    const config = {
      dpi: 300,
      activeVariant: 'US',
      variants: [{ name: 'US', widthDots: 1200, heightDots: 1800, unit: 'in' }],
    };
    const result = migrateLabelConfig(config as Record<string, unknown>);
    expect(result.activeVariant).toBe('US');
    expect(result.label.dpi).toBe(300);
    expect(result.label.variants).toHaveLength(1);
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
