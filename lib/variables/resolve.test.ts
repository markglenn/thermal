import { describe, it, expect } from 'vitest';
import { resolveVariables, mergeFieldData, evaluateCondition } from './resolve';
import type { LabelVariable } from '../types';

describe('resolveVariables', () => {
  it('resolves text variable to default value', () => {
    const vars: LabelVariable[] = [
      { name: 'lot', type: 'text', defaultValue: 'LOT-001' },
    ];
    const result = resolveVariables(vars);
    expect(result).toEqual({ lot: 'LOT-001' });
  });

  it('resolves date variable with format', () => {
    const vars: LabelVariable[] = [
      { name: 'printDate', type: 'date', defaultValue: '', format: 'YYYY-MM-DD' },
    ];
    const result = resolveVariables(vars, 0, new Date(2026, 2, 19));
    expect(result).toEqual({ printDate: '2026-03-19' });
  });

  it('resolves date with time tokens', () => {
    const vars: LabelVariable[] = [
      { name: 'ts', type: 'date', defaultValue: '', format: 'MM/DD/YY HH:mm:ss' },
    ];
    const now = new Date(2026, 0, 5, 14, 30, 45);
    const result = resolveVariables(vars, 0, now);
    expect(result).toEqual({ ts: '01/05/26 14:30:45' });
  });

  it('resolves date with default format when none specified', () => {
    const vars: LabelVariable[] = [
      { name: 'd', type: 'date', defaultValue: '' },
    ];
    const now = new Date(2026, 11, 25);
    const result = resolveVariables(vars, 0, now);
    expect(result).toEqual({ d: '2026-12-25' });
  });

  it('resolves counter at index 0', () => {
    const vars: LabelVariable[] = [
      { name: 'serial', type: 'counter', defaultValue: '', counter: { start: 1, increment: 1, padding: 5, prefix: 'SN-', suffix: '' } },
    ];
    const result = resolveVariables(vars, 0);
    expect(result).toEqual({ serial: 'SN-00001' });
  });

  it('resolves counter at index 3', () => {
    const vars: LabelVariable[] = [
      { name: 'serial', type: 'counter', defaultValue: '', counter: { start: 100, increment: 5, padding: 4, prefix: '', suffix: '' } },
    ];
    const result = resolveVariables(vars, 3);
    expect(result).toEqual({ serial: '0115' }); // 100 + 5*3
  });

  it('resolves counter with prefix and suffix', () => {
    const vars: LabelVariable[] = [
      { name: 'id', type: 'counter', defaultValue: '', counter: { start: 1, increment: 1, padding: 3, prefix: 'BOX-', suffix: '-A' } },
    ];
    const result = resolveVariables(vars, 9);
    expect(result).toEqual({ id: 'BOX-010-A' });
  });

  it('resolves multiple variables', () => {
    const vars: LabelVariable[] = [
      { name: 'lot', type: 'text', defaultValue: 'LOT-001' },
      { name: 'date', type: 'date', defaultValue: '', format: 'YYYY-MM-DD' },
      { name: 'seq', type: 'counter', defaultValue: '', counter: { start: 1, increment: 1, padding: 3, prefix: '', suffix: '' } },
    ];
    const now = new Date(2026, 2, 19);
    const result = resolveVariables(vars, 0, now);
    expect(result).toEqual({ lot: 'LOT-001', date: '2026-03-19', seq: '001' });
  });
});

describe('mergeFieldData', () => {
  it('field data overrides resolved variables', () => {
    const vars: LabelVariable[] = [
      { name: 'lot', type: 'text', defaultValue: 'LOT-001' },
      { name: 'date', type: 'date', defaultValue: '', format: 'YYYY-MM-DD' },
    ];
    const result = mergeFieldData(vars, { lot: 'CUSTOM-LOT' }, 0);
    expect(result.lot).toBe('CUSTOM-LOT');
    // date should still be resolved since not overridden
    expect(result.date).toBeDefined();
  });

  it('includes fields not in variables', () => {
    const vars: LabelVariable[] = [];
    const result = mergeFieldData(vars, { custom: 'value' });
    expect(result).toEqual({ custom: 'value' });
  });
});

describe('evaluateCondition', () => {
  it('== matches equal values', () => {
    expect(evaluateCondition({ field: 'region', operator: '==', value: 'UK' }, { region: 'UK' })).toBe(true);
    expect(evaluateCondition({ field: 'region', operator: '==', value: 'UK' }, { region: 'US' })).toBe(false);
  });

  it('!= matches unequal values', () => {
    expect(evaluateCondition({ field: 'region', operator: '!=', value: 'UK' }, { region: 'US' })).toBe(true);
    expect(evaluateCondition({ field: 'region', operator: '!=', value: 'UK' }, { region: 'UK' })).toBe(false);
  });

  it('isEmpty matches empty or missing fields', () => {
    expect(evaluateCondition({ field: 'notes', operator: 'isEmpty' }, { notes: '' })).toBe(true);
    expect(evaluateCondition({ field: 'notes', operator: 'isEmpty' }, {})).toBe(true);
    expect(evaluateCondition({ field: 'notes', operator: 'isEmpty' }, { notes: 'hello' })).toBe(false);
  });

  it('isNotEmpty matches non-empty fields', () => {
    expect(evaluateCondition({ field: 'allergens', operator: 'isNotEmpty' }, { allergens: 'peanuts' })).toBe(true);
    expect(evaluateCondition({ field: 'allergens', operator: 'isNotEmpty' }, { allergens: '' })).toBe(false);
    expect(evaluateCondition({ field: 'allergens', operator: 'isNotEmpty' }, {})).toBe(false);
  });

  it('== with missing value defaults to empty string comparison', () => {
    expect(evaluateCondition({ field: 'x', operator: '==' }, { x: '' })).toBe(true);
    expect(evaluateCondition({ field: 'x', operator: '==' }, { x: 'a' })).toBe(false);
  });

  it('missing field treated as empty string', () => {
    expect(evaluateCondition({ field: 'missing', operator: '==', value: '' }, {})).toBe(true);
    expect(evaluateCondition({ field: 'missing', operator: '==', value: 'x' }, {})).toBe(false);
  });
});
