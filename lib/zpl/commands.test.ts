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
});
