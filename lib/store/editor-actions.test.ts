import { describe, it, expect } from 'vitest';
import { generateId, createComponent } from './editor-actions';

// Register all components
import '../components';

describe('generateId', () => {
  it('returns a string starting with comp_', () => {
    expect(generateId()).toMatch(/^comp_\d+_/);
  });

  it('returns unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('createComponent', () => {
  it('creates a text component with defaults', () => {
    const comp = createComponent('text');
    expect(comp.typeData.type).toBe('text');
    expect(comp.name).toBe('Text');
    expect(comp.layout.horizontalAnchor).toBe('left');
    expect(comp.layout.verticalAnchor).toBe('top');
    expect(comp.children).toBeUndefined();
  });

  it('creates a container with empty children array', () => {
    const comp = createComponent('container');
    expect(comp.children).toEqual([]);
  });

  it('applies layout overrides', () => {
    const comp = createComponent('text', { x: 50, y: 100 });
    expect(comp.layout.x).toBe(50);
    expect(comp.layout.y).toBe(100);
  });

  it('preserves default layout values not overridden', () => {
    const comp = createComponent('text', { x: 50 });
    // Should have the default layout from the text definition, plus the override
    expect(comp.layout.x).toBe(50);
    expect(comp.layout.horizontalAnchor).toBe('left');
    expect(comp.layout.verticalAnchor).toBe('top');
  });
});
