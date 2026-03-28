import { describe, it, expect } from 'vitest';
import { validateDocument } from './validate';

describe('validateDocument', () => {
  const validDoc = {
    version: 1,
    label: { dpi: 203, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] },
    components: [],
  };

  const legacyDoc = {
    version: 1,
    label: { widthInches: 2, heightInches: 1, dpi: 203 },
    components: [],
  };

  it('accepts a valid document with variants', () => {
    expect(validateDocument(validDoc)).toBe(true);
  });

  it('accepts a legacy document with widthInches/heightInches', () => {
    expect(validateDocument(legacyDoc)).toBe(true);
  });

  it('accepts a document with components', () => {
    expect(validateDocument({ ...validDoc, components: [{ id: 'x' }] })).toBe(true);
  });

  it('rejects null', () => {
    expect(validateDocument(null)).toBe(false);
  });

  it('rejects a string', () => {
    expect(validateDocument('not a document')).toBe(false);
  });

  it('rejects wrong version', () => {
    expect(validateDocument({ ...validDoc, version: 2 })).toBe(false);
  });

  it('rejects missing label', () => {
    expect(validateDocument({ version: 1, components: [] })).toBe(false);
  });

  it('rejects invalid dpi', () => {
    expect(validateDocument({
      ...validDoc,
      label: { dpi: 150, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] },
    })).toBe(false);
  });

  it('rejects non-positive legacy dimensions', () => {
    expect(validateDocument({
      ...legacyDoc,
      label: { widthInches: 0, heightInches: 1, dpi: 203 },
    })).toBe(false);
    expect(validateDocument({
      ...legacyDoc,
      label: { widthInches: 2, heightInches: -1, dpi: 203 },
    })).toBe(false);
  });

  it('rejects empty variants array', () => {
    expect(validateDocument({
      ...validDoc,
      label: { dpi: 203, variants: [] },
    })).toBe(false);
  });

  it('rejects label with no variants and no legacy fields', () => {
    expect(validateDocument({
      version: 1,
      label: { dpi: 203 },
      components: [],
    })).toBe(false);
  });

  it('rejects missing components', () => {
    expect(validateDocument({ version: 1, label: validDoc.label })).toBe(false);
  });

  it('rejects non-array components', () => {
    expect(validateDocument({ ...validDoc, components: 'nope' })).toBe(false);
  });
});
