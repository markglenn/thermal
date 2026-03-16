import { describe, it, expect } from 'vitest';
import { resolveConstraints, resolveComponentTree, resolveDocument } from './resolver';
import type { LabelComponent, Constraints } from '../types';

describe('resolveConstraints', () => {
  const parentWidth = 400;
  const parentHeight = 200;

  describe('horizontal resolution', () => {
    it('stretches between left and right edges', () => {
      const result = resolveConstraints({ left: 10, right: 20 }, parentWidth, parentHeight);
      expect(result.x).toBe(10);
      expect(result.width).toBe(370); // 400 - 10 - 20
    });

    it('pins to left edge with width', () => {
      const result = resolveConstraints({ left: 10, width: 100 }, parentWidth, parentHeight);
      expect(result.x).toBe(10);
      expect(result.width).toBe(100);
    });

    it('pins to right edge with width', () => {
      const result = resolveConstraints({ right: 20, width: 100 }, parentWidth, parentHeight);
      expect(result.x).toBe(280); // 400 - 20 - 100
      expect(result.width).toBe(100);
    });

    it('ignores width when overconstrained (left + right + width)', () => {
      const result = resolveConstraints({ left: 10, right: 20, width: 50 }, parentWidth, parentHeight);
      expect(result.x).toBe(10);
      expect(result.width).toBe(370); // stretches, width ignored
    });

    it('centers with only width', () => {
      const result = resolveConstraints({ width: 100 }, parentWidth, parentHeight);
      expect(result.x).toBe(150); // (400 - 100) / 2
      expect(result.width).toBe(100);
    });

    it('uses fallback width with only left', () => {
      const result = resolveConstraints({ left: 50 }, parentWidth, parentHeight);
      expect(result.x).toBe(50);
      expect(result.width).toBe(100); // fallback
    });

    it('uses fallback width with only right', () => {
      const result = resolveConstraints({ right: 50 }, parentWidth, parentHeight);
      expect(result.x).toBe(250); // 400 - 50 - 100
      expect(result.width).toBe(100); // fallback
    });

    it('defaults to x=0 with fallback width when unconstrained', () => {
      const result = resolveConstraints({}, parentWidth, parentHeight);
      expect(result.x).toBe(0);
      expect(result.width).toBe(100); // fallback
    });

    it('clamps width to 0 when left + right exceed parent', () => {
      const result = resolveConstraints({ left: 300, right: 200 }, parentWidth, parentHeight);
      expect(result.x).toBe(300);
      expect(result.width).toBe(0); // Math.max(0, 400 - 300 - 200) = 0
    });
  });

  describe('vertical resolution', () => {
    it('stretches between top and bottom edges', () => {
      const result = resolveConstraints({ top: 10, bottom: 20 }, parentWidth, parentHeight);
      expect(result.y).toBe(10);
      expect(result.height).toBe(170); // 200 - 10 - 20
    });

    it('pins to top edge with height', () => {
      const result = resolveConstraints({ top: 10, height: 50 }, parentWidth, parentHeight);
      expect(result.y).toBe(10);
      expect(result.height).toBe(50);
    });

    it('pins to bottom edge with height', () => {
      const result = resolveConstraints({ bottom: 20, height: 50 }, parentWidth, parentHeight);
      expect(result.y).toBe(130); // 200 - 20 - 50
      expect(result.height).toBe(50);
    });

    it('ignores height when overconstrained (top + bottom + height)', () => {
      const result = resolveConstraints({ top: 10, bottom: 20, height: 999 }, parentWidth, parentHeight);
      expect(result.y).toBe(10);
      expect(result.height).toBe(170); // stretches
    });

    it('centers with only height', () => {
      const result = resolveConstraints({ height: 40 }, parentWidth, parentHeight);
      expect(result.y).toBe(80); // (200 - 40) / 2
      expect(result.height).toBe(40);
    });

    it('uses fallback height with only top', () => {
      const result = resolveConstraints({ top: 30 }, parentWidth, parentHeight);
      expect(result.y).toBe(30);
      expect(result.height).toBe(40); // fallback
    });

    it('uses fallback height with only bottom', () => {
      const result = resolveConstraints({ bottom: 30 }, parentWidth, parentHeight);
      expect(result.y).toBe(130); // 200 - 30 - 40
      expect(result.height).toBe(40); // fallback
    });
  });

  describe('combined constraints', () => {
    it('resolves both axes independently', () => {
      const result = resolveConstraints(
        { left: 10, width: 100, top: 20, height: 50 },
        parentWidth,
        parentHeight
      );
      expect(result).toEqual({ x: 10, y: 20, width: 100, height: 50 });
    });

    it('handles zero values as valid constraints', () => {
      const result = resolveConstraints({ left: 0, top: 0, width: 100, height: 50 }, parentWidth, parentHeight);
      expect(result).toEqual({ x: 0, y: 0, width: 100, height: 50 });
    });
  });
});

describe('resolveComponentTree', () => {
  function makeComponent(id: string, constraints: Constraints, children?: LabelComponent[]): LabelComponent {
    return {
      id,
      name: id,
      constraints,
      pins: [],
      typeData: { type: 'rectangle', props: { borderThickness: 1, cornerRadius: 0, filled: false } },
      children,
    };
  }

  it('resolves a flat list of components', () => {
    const components = [
      makeComponent('a', { left: 10, top: 10, width: 100, height: 50 }),
      makeComponent('b', { left: 120, top: 10, width: 100, height: 50 }),
    ];
    const result = resolveComponentTree(components, 400, 200);
    expect(result.get('a')).toEqual({ x: 10, y: 10, width: 100, height: 50 });
    expect(result.get('b')).toEqual({ x: 120, y: 10, width: 100, height: 50 });
  });

  it('resolves children relative to parent bounds', () => {
    const child = makeComponent('child', { left: 5, top: 5, width: 40, height: 20 });
    const parent = makeComponent('parent', { left: 50, top: 50, width: 200, height: 100 }, [child]);

    const result = resolveComponentTree([parent], 400, 200);

    // Parent resolved relative to label
    expect(result.get('parent')).toEqual({ x: 50, y: 50, width: 200, height: 100 });
    // Child resolved relative to parent (200x100)
    expect(result.get('child')).toEqual({ x: 5, y: 5, width: 40, height: 20 });
  });

  it('resolves deeply nested children', () => {
    const grandchild = makeComponent('gc', { left: 2, top: 2, width: 10, height: 10 });
    const child = makeComponent('c', { left: 10, top: 10, width: 80, height: 40 }, [grandchild]);
    const parent = makeComponent('p', { left: 0, top: 0, width: 200, height: 100 }, [child]);

    const result = resolveComponentTree([parent], 400, 200);
    expect(result.get('gc')).toEqual({ x: 2, y: 2, width: 10, height: 10 });
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
        constraints: { left: 10, top: 10, width: 100, height: 50 },
        pins: [] as const,
        typeData: { type: 'rectangle' as const, props: { borderThickness: 1, cornerRadius: 0, filled: false } },
      }],
    };
    const result = resolveDocument(doc);
    expect(result.get('a')).toEqual({ x: 10, y: 10, width: 100, height: 50 });
  });
});
