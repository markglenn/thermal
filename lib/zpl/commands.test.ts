import { describe, it, expect } from 'vitest';
import { fieldOrigin } from './commands';

describe('fieldOrigin', () => {
  it('generates ^FO with integer coordinates', () => {
    expect(fieldOrigin(50, 100)).toBe('^FO50,100');
  });

  it('rounds fractional coordinates', () => {
    expect(fieldOrigin(50.7, 100.3)).toBe('^FO51,100');
  });

  it('handles zero coordinates', () => {
    expect(fieldOrigin(0, 0)).toBe('^FO0,0');
  });

  it('clamps negative coordinates to 0', () => {
    expect(fieldOrigin(-10, -5)).toBe('^FO0,0');
    expect(fieldOrigin(-10, 50)).toBe('^FO0,50');
    expect(fieldOrigin(50, -10)).toBe('^FO50,0');
  });

  it('clamps coordinates above 32000', () => {
    expect(fieldOrigin(33000, 50000)).toBe('^FO32000,32000');
    expect(fieldOrigin(100, 33000)).toBe('^FO100,32000');
  });
});
