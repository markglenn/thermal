import { describe, it, expect } from 'vitest';
import { validateRequiredFields } from './validate-required';
import type { LabelDocument } from '../types';

function makeDoc(variables: LabelDocument['variables']): LabelDocument {
  return {
    version: 1,
    label: { dpi: 203, variants: [{ name: 'default', widthDots: 406, heightDots: 203, unit: 'in' }] },
    components: [],
    variables,
  };
}

describe('validateRequiredFields', () => {
  it('returns no errors when no required variables', () => {
    const doc = makeDoc([{ name: 'lot', type: 'text', defaultValue: 'X' }]);
    expect(validateRequiredFields(doc, [{}])).toEqual([]);
  });

  it('returns no errors when variables undefined', () => {
    const doc = makeDoc(undefined);
    expect(validateRequiredFields(doc, [{}])).toEqual([]);
  });

  it('errors when a required field is missing from a row', () => {
    const doc = makeDoc([{ name: 'sku', type: 'text', defaultValue: '', required: true }]);
    const errors = validateRequiredFields(doc, [{}]);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('data[0].sku');
  });

  it('errors when a required field is empty or whitespace', () => {
    const doc = makeDoc([{ name: 'sku', type: 'text', defaultValue: '', required: true }]);
    expect(validateRequiredFields(doc, [{ sku: '' }])).toHaveLength(1);
    expect(validateRequiredFields(doc, [{ sku: '   ' }])).toHaveLength(1);
  });

  it('passes when all required fields have values', () => {
    const doc = makeDoc([
      { name: 'sku', type: 'text', defaultValue: '', required: true },
      { name: 'qty', type: 'text', defaultValue: '', required: true },
    ]);
    expect(validateRequiredFields(doc, [{ sku: 'A1', qty: '5' }])).toEqual([]);
  });

  it('reports errors per row index', () => {
    const doc = makeDoc([{ name: 'sku', type: 'text', defaultValue: '', required: true }]);
    const errors = validateRequiredFields(doc, [{ sku: 'ok' }, {}, { sku: '' }]);
    expect(errors.map((e) => e.path)).toEqual(['data[1].sku', 'data[2].sku']);
  });

  it('ignores non-required variables', () => {
    const doc = makeDoc([
      { name: 'lot', type: 'text', defaultValue: '' },
      { name: 'sku', type: 'text', defaultValue: '', required: true },
    ]);
    expect(validateRequiredFields(doc, [{ sku: 'X' }])).toEqual([]);
  });
});
