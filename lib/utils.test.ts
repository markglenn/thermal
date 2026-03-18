import { describe, it, expect } from 'vitest';
import { findComponent } from './utils';
import type { LabelComponent } from './types';

function makeComponent(id: string): LabelComponent {
  return {
    id,
    name: id,
    layout: { x: 0, y: 0, width: 100, height: 40, horizontalAnchor: 'left', verticalAnchor: 'top' },
    typeData: { type: 'rectangle', props: { borderThickness: 1, cornerRadius: 0, filled: false } },
  };
}

describe('findComponent', () => {
  it('finds a top-level component', () => {
    const components = [makeComponent('a'), makeComponent('b')];
    expect(findComponent(components, 'b')?.id).toBe('b');
  });

  it('returns null for non-existent id', () => {
    expect(findComponent([makeComponent('a')], 'missing')).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(findComponent([], 'a')).toBeNull();
  });
});
