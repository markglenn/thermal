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

    it('center-anchored with x=0: component perfectly centered', () => {
      const result = resolveLayout(
        defaultLayout({ x: 0, width: 100, horizontalAnchor: 'center' }),
        parentWidth,
        parentHeight
      );
      expect(result.x).toBe(150); // (400 - 100) / 2 + 0
      expect(result.width).toBe(100);
    });

    it('center-anchored with positive x: offset right of center', () => {
      const result = resolveLayout(
        defaultLayout({ x: 10, width: 100, horizontalAnchor: 'center' }),
        parentWidth,
        parentHeight
      );
      expect(result.x).toBe(160); // (400 - 100) / 2 + 10
      expect(result.width).toBe(100);
    });

    it('center-anchored with negative x: offset left of center', () => {
      const result = resolveLayout(
        defaultLayout({ x: -20, width: 100, horizontalAnchor: 'center' }),
        parentWidth,
        parentHeight
      );
      expect(result.x).toBe(130); // (400 - 100) / 2 + (-20)
      expect(result.width).toBe(100);
    });

    it('center-anchored: width change keeps centering', () => {
      // Same x=0 but different widths should stay centered
      const narrow = resolveLayout(
        defaultLayout({ x: 0, width: 50, horizontalAnchor: 'center' }),
        parentWidth,
        parentHeight
      );
      const wide = resolveLayout(
        defaultLayout({ x: 0, width: 200, horizontalAnchor: 'center' }),
        parentWidth,
        parentHeight
      );
      // Both should be centered: x + width/2 = parentWidth/2
      expect(narrow.x + narrow.width / 2).toBe(200);
      expect(wide.x + wide.width / 2).toBe(200);
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
  function makeComponent(id: string, layout: Partial<ComponentLayout>): LabelComponent {
    return {
      id,
      name: id,
      layout: defaultLayout(layout),
      typeData: { type: 'rectangle', props: { borderThickness: 1, cornerRadius: 0, filled: false } },
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

  it('resolves right-anchored component', () => {
    const components = [
      makeComponent('a', { x: 10, y: 5, width: 40, height: 20, horizontalAnchor: 'right' }),
    ];
    const result = resolveComponentTree(components, 400, 200);
    // x = 400 - 10 - 40 = 350
    expect(result.get('a')).toEqual({ x: 350, y: 5, width: 40, height: 20 });
  });

  it('resolves center-anchored component', () => {
    const components = [
      makeComponent('a', { x: 0, y: 5, width: 100, height: 20, horizontalAnchor: 'center' }),
    ];
    const result = resolveComponentTree(components, 400, 200);
    // x = (400 - 100) / 2 + 0 = 150
    expect(result.get('a')).toEqual({ x: 150, y: 5, width: 100, height: 20 });
  });

  it('returns empty map for empty components', () => {
    const result = resolveComponentTree([], 400, 200);
    expect(result.size).toBe(0);
  });
});

describe('resolveDocument', () => {
  it('resolves using label config dimensions', () => {
    const doc = {
      label: { dpi: 203 as const, activeVariant: 'Default', variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' as const }] },
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
