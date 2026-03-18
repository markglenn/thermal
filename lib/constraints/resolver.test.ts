import { describe, it, expect } from 'vitest';
import { resolveLayout, resolveComponentTree, resolveDocument } from './resolver';
import type { LabelComponent, ComponentLayout } from '../types';

function defaultLayout(overrides: Partial<ComponentLayout> = {}): ComponentLayout {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    horizontalAnchor: 'left',
    verticalAnchor: 'top',
    ...overrides,
  };
}

describe('resolveLayout', () => {
  const parentWidth = 400;
  const parentHeight = 200;

  describe('horizontal resolution', () => {
    it('left-anchored: x passes through', () => {
      const result = resolveLayout(defaultLayout({ x: 10, width: 100 }), parentWidth, parentHeight);
      expect(result.x).toBe(10);
      expect(result.width).toBe(100);
    });

    it('right-anchored: x = parentWidth - layout.x - layout.width', () => {
      const result = resolveLayout(
        defaultLayout({ x: 20, width: 100, horizontalAnchor: 'right' }),
        parentWidth,
        parentHeight
      );
      expect(result.x).toBe(280); // 400 - 20 - 100
      expect(result.width).toBe(100);
    });

    it('left-anchored with x=0: component at left edge', () => {
      const result = resolveLayout(defaultLayout({ x: 0, width: 50 }), parentWidth, parentHeight);
      expect(result.x).toBe(0);
      expect(result.width).toBe(50);
    });

    it('right-anchored with x=0: component at right edge', () => {
      const result = resolveLayout(
        defaultLayout({ x: 0, width: 50, horizontalAnchor: 'right' }),
        parentWidth,
        parentHeight
      );
      expect(result.x).toBe(350); // 400 - 0 - 50
      expect(result.width).toBe(50);
    });
  });

  describe('vertical resolution', () => {
    it('top-anchored: y passes through', () => {
      const result = resolveLayout(defaultLayout({ y: 10, height: 50 }), parentWidth, parentHeight);
      expect(result.y).toBe(10);
      expect(result.height).toBe(50);
    });

    it('bottom-anchored: y = parentHeight - layout.y - layout.height', () => {
      const result = resolveLayout(
        defaultLayout({ y: 20, height: 50, verticalAnchor: 'bottom' }),
        parentWidth,
        parentHeight
      );
      expect(result.y).toBe(130); // 200 - 20 - 50
      expect(result.height).toBe(50);
    });

    it('top-anchored with y=0: component at top edge', () => {
      const result = resolveLayout(defaultLayout({ y: 0, height: 30 }), parentWidth, parentHeight);
      expect(result.y).toBe(0);
    });

    it('bottom-anchored with y=0: component at bottom edge', () => {
      const result = resolveLayout(
        defaultLayout({ y: 0, height: 30, verticalAnchor: 'bottom' }),
        parentWidth,
        parentHeight
      );
      expect(result.y).toBe(170); // 200 - 0 - 30
    });
  });

  describe('combined anchors', () => {
    it('left-top: both pass through', () => {
      const result = resolveLayout(
        defaultLayout({ x: 10, y: 20, width: 100, height: 50 }),
        parentWidth,
        parentHeight
      );
      expect(result).toEqual({ x: 10, y: 20, width: 100, height: 50 });
    });

    it('right-bottom: both computed from opposite edges', () => {
      const result = resolveLayout(
        defaultLayout({ x: 10, y: 20, width: 100, height: 50, horizontalAnchor: 'right', verticalAnchor: 'bottom' }),
        parentWidth,
        parentHeight
      );
      expect(result).toEqual({ x: 290, y: 130, width: 100, height: 50 });
      // x = 400 - 10 - 100 = 290, y = 200 - 20 - 50 = 130
    });

    it('handles zero values correctly', () => {
      const result = resolveLayout(
        defaultLayout({ x: 0, y: 0, width: 100, height: 50 }),
        parentWidth,
        parentHeight
      );
      expect(result).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    });
  });
});

describe('resolveComponentTree', () => {
  function makeComponent(id: string, layout: Partial<ComponentLayout>, children?: LabelComponent[]): LabelComponent {
    return {
      id,
      name: id,
      layout: defaultLayout(layout),
      typeData: { type: 'rectangle', props: { borderThickness: 1, cornerRadius: 0, filled: false } },
      children,
    };
  }

  it('resolves a flat list of components', () => {
    const components = [
      makeComponent('a', { x: 10, y: 10, width: 100, height: 50 }),
      makeComponent('b', { x: 120, y: 10, width: 100, height: 50 }),
    ];
    const result = resolveComponentTree(components, 400, 200);
    expect(result.get('a')).toEqual({ x: 10, y: 10, width: 100, height: 50 });
    expect(result.get('b')).toEqual({ x: 120, y: 10, width: 100, height: 50 });
  });

  it('resolves children relative to parent bounds', () => {
    const child = makeComponent('child', { x: 5, y: 5, width: 40, height: 20 });
    const parent = makeComponent('parent', { x: 50, y: 50, width: 200, height: 100 }, [child]);

    const result = resolveComponentTree([parent], 400, 200);

    // Parent resolved relative to label
    expect(result.get('parent')).toEqual({ x: 50, y: 50, width: 200, height: 100 });
    // Child resolved relative to parent (200x100)
    expect(result.get('child')).toEqual({ x: 5, y: 5, width: 40, height: 20 });
  });

  it('resolves deeply nested children', () => {
    const grandchild = makeComponent('gc', { x: 2, y: 2, width: 10, height: 10 });
    const child = makeComponent('c', { x: 10, y: 10, width: 80, height: 40 }, [grandchild]);
    const parent = makeComponent('p', { x: 0, y: 0, width: 200, height: 100 }, [child]);

    const result = resolveComponentTree([parent], 400, 200);
    expect(result.get('gc')).toEqual({ x: 2, y: 2, width: 10, height: 10 });
  });

  it('resolves right-anchored child within parent', () => {
    const child = makeComponent('child', { x: 10, y: 5, width: 40, height: 20, horizontalAnchor: 'right' });
    const parent = makeComponent('parent', { x: 0, y: 0, width: 200, height: 100 }, [child]);

    const result = resolveComponentTree([parent], 400, 200);
    // child x = parentWidth(200) - 10 - 40 = 150
    expect(result.get('child')).toEqual({ x: 150, y: 5, width: 40, height: 20 });
  });

  it('returns empty map for empty components', () => {
    const result = resolveComponentTree([], 400, 200);
    expect(result.size).toBe(0);
  });
});

describe('resolveDocument', () => {
  it('resolves using label config dimensions', () => {
    const doc = {
      label: { widthInches: 2, heightInches: 1, dpi: 203 as const },
      components: [{
        id: 'a',
        name: 'a',
        layout: defaultLayout({ x: 10, y: 10, width: 100, height: 50 }),
        typeData: { type: 'rectangle' as const, props: { borderThickness: 1, cornerRadius: 0, filled: false } },
      }],
    };
    const result = resolveDocument(doc);
    expect(result.get('a')).toEqual({ x: 10, y: 10, width: 100, height: 50 });
  });
});
