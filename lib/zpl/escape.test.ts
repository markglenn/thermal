import { describe, it, expect } from 'vitest';
import { emitFieldData } from './escape';

describe('emitFieldData', () => {
  it('emits plain ^FD for safe values (no ^ or ~)', () => {
    expect(emitFieldData('Hello World')).toBe('^FDHello World^FS');
    expect(emitFieldData('order_1234')).toBe('^FDorder_1234^FS');
    expect(emitFieldData('https://example.com/path?q=v')).toBe('^FDhttps://example.com/path?q=v^FS');
  });

  it('escapes ^ in values and prefixes ^FH_', () => {
    expect(emitFieldData('^XZ^XA')).toBe('^FH_^FD_5EXZ_5EXA^FS');
  });

  it('escapes ~ (control command prefix)', () => {
    expect(emitFieldData('bad~JR')).toBe('^FH_^FDbad_7EJR^FS');
  });

  it('escapes _ once ^FH_ is enabled, to prevent re-interpretation', () => {
    // Mixed case: user value has both `^` (triggers escaping) and `_`
    expect(emitFieldData('file_name^XZ')).toBe('^FH_^FDfile_5Fname_5EXZ^FS');
  });

  it('leaves plain underscores alone when no ^/~ present', () => {
    // Don't escape `_` unless we actually enabled ^FH_
    expect(emitFieldData('order_1234')).toBe('^FDorder_1234^FS');
  });

  it('handles empty string', () => {
    expect(emitFieldData('')).toBe('^FD^FS');
  });

  it('handles unicode safely', () => {
    expect(emitFieldData('café')).toBe('^FDcafé^FS');
    expect(emitFieldData('日本語')).toBe('^FD日本語^FS');
  });
});
