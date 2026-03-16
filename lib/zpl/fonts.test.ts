import { describe, it, expect } from 'vitest';
import { getZplRotation, getZplFontWithRotation } from './fonts';

describe('getZplRotation', () => {
  it('maps 0 to N', () => expect(getZplRotation(0)).toBe('N'));
  it('maps 90 to R', () => expect(getZplRotation(90)).toBe('R'));
  it('maps 180 to I', () => expect(getZplRotation(180)).toBe('I'));
  it('maps 270 to B', () => expect(getZplRotation(270)).toBe('B'));
  it('defaults to N for unknown values', () => expect(getZplRotation(45)).toBe('N'));
});

describe('getZplFontWithRotation', () => {
  it('generates ^A command for Font 0 no rotation', () => {
    expect(getZplFontWithRotation('0', 30, 25, 0)).toBe('^A0N,30,25');
  });

  it('generates ^A command with rotation', () => {
    expect(getZplFontWithRotation('A', 20, 15, 90)).toBe('^AAR,20,15');
  });

  it('handles Font 0 with 180 rotation', () => {
    expect(getZplFontWithRotation('0', 40, 30, 180)).toBe('^A0I,40,30');
  });
});
