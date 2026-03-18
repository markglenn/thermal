import { describe, it, expect } from 'vitest';
import { assignFieldNumbers } from './field-numbers';
import type { LabelComponent } from '../types';

function makeComp(id: string, type: string, fieldBinding?: string): LabelComponent {
  return {
    id,
    name: id,
    layout: { x: 0, y: 0, width: 100, height: 40, horizontalAnchor: 'left', verticalAnchor: 'top' },
    fieldBinding,
    typeData: { type: type as 'text', props: {} as never },
  };
}

describe('assignFieldNumbers', () => {
  it('assigns sequential numbers to bound components', () => {
    const comps = [
      makeComp('a', 'text', 'name'),
      makeComp('b', 'barcode', 'sku'),
      makeComp('c', 'text'),
    ];
    const result = assignFieldNumbers(comps);
    expect(result.byComponentId.get('a')).toBe(1);
    expect(result.byComponentId.get('b')).toBe(2);
    expect(result.byComponentId.has('c')).toBe(false);
    expect(result.mappings).toHaveLength(2);
  });

  it('handles duplicate binding names', () => {
    const comps = [
      makeComp('a', 'text', 'name'),
      makeComp('b', 'text', 'name'),
    ];
    const result = assignFieldNumbers(comps);
    expect(result.byComponentId.get('a')).toBe(1);
    expect(result.byComponentId.get('b')).toBe(2);
    expect(result.byBindingName.get('name')).toEqual([1, 2]);
  });

  it('returns empty maps when no bindings exist', () => {
    const comps = [makeComp('a', 'text'), makeComp('b', 'rectangle')];
    const result = assignFieldNumbers(comps);
    expect(result.mappings).toHaveLength(0);
    expect(result.byComponentId.size).toBe(0);
  });
});
