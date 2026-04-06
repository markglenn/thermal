import { describe, it, expect } from 'vitest';
import { extractLabelSize, summaryFieldsFromDocument, dotsToInches, versionToSummary } from './labels';

describe('extractLabelSize', () => {
  it('extracts size from variants format', () => {
    const doc = { label: { dpi: 203, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] }, version: 1, components: [] };
    expect(extractLabelSize(doc)).toEqual({ widthDots: 406, heightDots: 203, dpi: 203 });
  });

  it('extracts size from legacy format', () => {
    const doc = { label: { dpi: 203, widthInches: 2, heightInches: 1 }, version: 1, components: [] };
    expect(extractLabelSize(doc)).toEqual({ widthDots: 406, heightDots: 203, dpi: 203 });
  });

  it('returns null for missing label', () => {
    expect(extractLabelSize({})).toBeNull();
    expect(extractLabelSize(null)).toBeNull();
    expect(extractLabelSize('string')).toBeNull();
  });

  it('returns null for label with no size info', () => {
    expect(extractLabelSize({ label: { dpi: 203 } })).toBeNull();
  });

  it('uses first variant when multiple exist', () => {
    const doc = {
      label: { dpi: 300, variants: [
        { name: 'Small', widthDots: 300, heightDots: 150, unit: 'in' },
        { name: 'Large', widthDots: 600, heightDots: 300, unit: 'in' },
      ] },
      version: 1,
      components: [],
    };
    expect(extractLabelSize(doc)).toEqual({ widthDots: 300, heightDots: 150, dpi: 300 });
  });
});

describe('summaryFieldsFromDocument', () => {
  it('returns summary fields from a valid document', () => {
    const doc = { label: { dpi: 203, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] }, version: 1, components: [] };
    expect(summaryFieldsFromDocument(doc)).toEqual({ widthDots: 406, heightDots: 203, dpi: 203 });
  });

  it('returns nulls for invalid document', () => {
    expect(summaryFieldsFromDocument(null)).toEqual({ widthDots: null, heightDots: null, dpi: null });
  });
});

describe('dotsToInches', () => {
  it('converts correctly', () => {
    expect(dotsToInches(406, 203)).toBe(2);
    expect(dotsToInches(203, 203)).toBe(1);
    expect(dotsToInches(600, 300)).toBe(2);
  });
});

describe('versionToSummary', () => {
  it('computes widthInches/heightInches from dots', () => {
    const result = versionToSummary({
      id: 'v1', version: 1, status: null, hasThumbnail: true,
      widthDots: 406, heightDots: 203, dpi: 203,
      archivedAt: null, createdAt: new Date('2026-01-01'), updatedAt: null,
    });
    expect(result.widthInches).toBe(2);
    expect(result.heightInches).toBe(1);
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.updatedAt).toBeNull();
  });

  it('returns null inches when dots are missing', () => {
    const result = versionToSummary({
      id: 'v1', version: 1, status: null, hasThumbnail: false,
      widthDots: null, heightDots: null, dpi: null,
      archivedAt: null, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'),
    });
    expect(result.widthInches).toBeNull();
    expect(result.heightInches).toBeNull();
    expect(result.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });
});
