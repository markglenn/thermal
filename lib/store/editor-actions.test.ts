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
    expect(comp.pins).toEqual([]);
    expect(comp.children).toBeUndefined();
  });

  it('creates a container with empty children array', () => {
    const comp = createComponent('container');
    expect(comp.children).toEqual([]);
  });

  it('applies constraint overrides', () => {
    const comp = createComponent('text', { left: 50, top: 100 });
    expect(comp.constraints.left).toBe(50);
    expect(comp.constraints.top).toBe(100);
  });

  it('preserves default constraints not overridden', () => {
    const comp = createComponent('text', { left: 50 });
    // Should have the default constraints from the text definition, plus the override
    expect(comp.constraints.left).toBe(50);
  });
});
