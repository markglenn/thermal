import { describe, it, expect } from 'vitest';
import { getDefinition, getAllDefinitions, getSizingMode } from './registry';
import type { LabelComponent } from '../types';

// Register all components
import '.';

describe('getDefinition', () => {
  it('returns definition for known type', () => {
    const def = getDefinition('text');
    expect(def.type).toBe('text');
    expect(def.label).toBeDefined();
  });

  it('throws for unknown type', () => {
    expect(() => getDefinition('nonexistent')).toThrow('Unknown component type: nonexistent');
  });
});

describe('getAllDefinitions', () => {
  it('returns all 7 registered components', () => {
    const defs = getAllDefinitions();
    expect(defs).toHaveLength(7);
    const types = defs.map(d => d.type);
    expect(types).toContain('text');
    expect(types).toContain('barcode');
    expect(types).toContain('qrcode');
    expect(types).toContain('rectangle');
    expect(types).toContain('ellipse');
    expect(types).toContain('line');
    expect(types).toContain('image');
  });
});

describe('getSizingMode', () => {
  function makeComponent(type: string): LabelComponent {
    return {
      id: 'test',
      name: 'test',
      layout: { x: 0, y: 0, width: 100, height: 40, horizontalAnchor: 'left', verticalAnchor: 'top' },
      typeData: { type, props: {} } as LabelComponent['typeData'],
    };
  }

  it('returns auto for text (autoSized)', () => {
    expect(getSizingMode(makeComponent('text'))).toBe('auto');
  });

  it('returns fixed for rectangle (not autoSized)', () => {
    expect(getSizingMode(makeComponent('rectangle'))).toBe('fixed');
  });

  it('returns fixed for unknown type', () => {
    expect(getSizingMode(makeComponent('nonexistent'))).toBe('fixed');
  });
});
