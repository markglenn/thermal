import { describe, it, expect } from 'vitest';
import { findComponent } from './utils';
import type { LabelComponent } from './types';

function makeComponent(id: string, children?: LabelComponent[]): LabelComponent {
  return {
    id,
    name: id,
    constraints: {},
    pins: [],
    typeData: { type: 'rectangle', props: { borderThickness: 1, cornerRadius: 0, filled: false } },
    children,
  };
}

describe('findComponent', () => {
  it('finds a top-level component', () => {
    const components = [makeComponent('a'), makeComponent('b')];
    expect(findComponent(components, 'b')?.id).toBe('b');
  });

  it('finds a nested component', () => {
    const child = makeComponent('child');
    const parent = makeComponent('parent', [child]);
    expect(findComponent([parent], 'child')?.id).toBe('child');
  });

  it('finds deeply nested component', () => {
    const gc = makeComponent('gc');
    const child = makeComponent('child', [gc]);
    const parent = makeComponent('parent', [child]);
    expect(findComponent([parent], 'gc')?.id).toBe('gc');
  });

  it('returns null for non-existent id', () => {
    expect(findComponent([makeComponent('a')], 'missing')).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(findComponent([], 'a')).toBeNull();
  });
});
