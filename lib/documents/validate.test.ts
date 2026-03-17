import { describe, it, expect } from 'vitest';
import { validateDocument } from './validate';

describe('validateDocument', () => {
  const validDoc = {
    version: 1,
    label: { widthInches: 2, heightInches: 1, dpi: 203 },
    components: [],
  };

  it('accepts a valid document', () => {
    expect(validateDocument(validDoc)).toBe(true);
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
      label: { widthInches: 2, heightInches: 1, dpi: 150 },
    })).toBe(false);
  });

  it('rejects non-positive dimensions', () => {
    expect(validateDocument({
      ...validDoc,
      label: { widthInches: 0, heightInches: 1, dpi: 203 },
    })).toBe(false);
    expect(validateDocument({
      ...validDoc,
      label: { widthInches: 2, heightInches: -1, dpi: 203 },
    })).toBe(false);
  });

  it('rejects missing components', () => {
    expect(validateDocument({ version: 1, label: validDoc.label })).toBe(false);
  });

  it('rejects non-array components', () => {
    expect(validateDocument({ ...validDoc, components: 'nope' })).toBe(false);
  });
});
