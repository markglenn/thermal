import { describe, it, expect } from 'vitest';
import {
  validatePrintRequest,
  MAX_PRINT_ROWS,
  MAX_FIELD_VALUE_LENGTH,
  MAX_FIELDS_PER_ROW,
  MAX_COPIES,
} from './validate-print';

function validRequest(overrides: Record<string, unknown> = {}) {
  return {
    data: [{ sku: 'ABC-123', qty: '10' }],
    ...overrides,
  };
}

describe('validatePrintRequest', () => {
  it('accepts a minimal valid request', () => {
    const result = validatePrintRequest(validRequest());
    expect(result.valid).toBe(true);
    expect(result.parsed).toBeDefined();
    expect(result.parsed!.data).toHaveLength(1);
    expect(result.parsed!.copies).toBe(1);
    expect(result.parsed!.printer).toBeUndefined();
  });

  it('accepts request with printer and copies', () => {
    const result = validatePrintRequest(validRequest({ printer: 'ZD621', copies: 5 }));
    expect(result.valid).toBe(true);
    expect(result.parsed!.printer).toBe('ZD621');
    expect(result.parsed!.copies).toBe(5);
  });

  it('floors fractional copies', () => {
    const result = validatePrintRequest(validRequest({ copies: 3.7 }));
    expect(result.valid).toBe(true);
    expect(result.parsed!.copies).toBe(3);
  });

  // --- Rejections ---

  it('rejects non-object body', () => {
    expect(validatePrintRequest(null).valid).toBe(false);
    expect(validatePrintRequest('string').valid).toBe(false);
    expect(validatePrintRequest([]).valid).toBe(false);
  });

  it('rejects missing data', () => {
    expect(validatePrintRequest({}).valid).toBe(false);
  });

  it('rejects empty data array', () => {
    expect(validatePrintRequest({ data: [] }).valid).toBe(false);
  });

  it('rejects data row that is not an object', () => {
    const result = validatePrintRequest({ data: ['string'] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'data[0]')).toBe(true);
  });

  it('rejects non-string field values', () => {
    const result = validatePrintRequest({ data: [{ qty: 10 }] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'data[0].qty')).toBe(true);
  });

  it('rejects non-string printer', () => {
    const result = validatePrintRequest(validRequest({ printer: 123 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'printer')).toBe(true);
  });

  it('rejects empty string printer', () => {
    const result = validatePrintRequest(validRequest({ printer: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'printer')).toBe(true);
  });

  it('rejects copies < 1', () => {
    const result = validatePrintRequest(validRequest({ copies: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === 'copies')).toBe(true);
  });

  it('rejects non-number copies', () => {
    const result = validatePrintRequest(validRequest({ copies: 'five' }));
    expect(result.valid).toBe(false);
  });

  // --- Limits ---

  it('rejects too many rows', () => {
    const data = Array.from({ length: MAX_PRINT_ROWS + 1 }, () => ({ a: 'b' }));
    const result = validatePrintRequest({ data });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('max rows'))).toBe(true);
  });

  it('rejects field values exceeding max length', () => {
    const result = validatePrintRequest({ data: [{ big: 'x'.repeat(MAX_FIELD_VALUE_LENGTH + 1) }] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('max length'))).toBe(true);
  });

  it('rejects row with too many fields', () => {
    const row: Record<string, string> = {};
    for (let i = 0; i <= MAX_FIELDS_PER_ROW; i++) row[`f${i}`] = 'v';
    const result = validatePrintRequest({ data: [row] });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('max fields'))).toBe(true);
  });

  it('rejects copies exceeding max', () => {
    const result = validatePrintRequest(validRequest({ copies: MAX_COPIES + 1 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('max copies'))).toBe(true);
  });
});
