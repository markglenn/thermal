import { describe, it, expect } from 'vitest';
import { generateZpl, generateZplWithMap } from './generator';
import type { LabelDocument } from '../types';

// Must import to register components before generateZpl uses getDefinition
import '../components';

describe('generateZpl', () => {
  const baseDoc: LabelDocument = {
    version: 1,
    label: { widthInches: 2, heightInches: 1, dpi: 203 },
    components: [],
  };

  it('generates empty label with header and footer', () => {
    const zpl = generateZpl(baseDoc);
    const lines = zpl.split('\n');
    expect(lines[0]).toBe('^XA');
    expect(lines[1]).toBe('^PW406'); // 2 * 203
    expect(lines[2]).toBe('^LL203'); // 1 * 203
    expect(lines[lines.length - 1]).toBe('^XZ');
  });

  it('generates ZPL for a text component', () => {
    const doc: LabelDocument = {
      ...baseDoc,
      components: [{
        id: 't1',
        name: 'Text',
        layout: {
          x: 10, y: 20, width: 100, height: 30,
          horizontalAnchor: 'left', verticalAnchor: 'top',
        },
        typeData: {
          type: 'text',
          props: {
            content: 'Hello',
            font: '0',
            fontSize: 30,
            fontWidth: 25,
            rotation: 0,
          },
        },
      }],
    };
    const zpl = generateZpl(doc);
    expect(zpl).toContain('^FO10,20');
    expect(zpl).toContain('^A0N,30,25');
    expect(zpl).toContain('^FDHello^FS');
  });

  it('generates ZPL for a rectangle component', () => {
    const doc: LabelDocument = {
      ...baseDoc,
      components: [{
        id: 'r1',
        name: 'Rect',
        layout: {
          x: 0, y: 0, width: 200, height: 100,
          horizontalAnchor: 'left', verticalAnchor: 'top',
        },
        typeData: {
          type: 'rectangle',
          props: { borderThickness: 3, cornerRadius: 5, filled: false },
        },
      }],
    };
    const zpl = generateZpl(doc);
    expect(zpl).toContain('^FO0,0');
    expect(zpl).toContain('^GB200,100,3,B,5^FS');
  });

  it('uses correct dimensions for different DPI', () => {
    const doc: LabelDocument = {
      ...baseDoc,
      label: { widthInches: 4, heightInches: 6, dpi: 300 },
      components: [],
    };
    const zpl = generateZpl(doc);
    expect(zpl).toContain('^PW1200'); // 4 * 300
    expect(zpl).toContain('^LL1800'); // 6 * 300
  });
});

describe('generateZplWithMap', () => {
  const baseDoc: LabelDocument = {
    version: 1,
    label: { widthInches: 2, heightInches: 1, dpi: 203 },
    components: [],
  };

  it('returns empty map for empty document', () => {
    const { componentLineMap } = generateZplWithMap(baseDoc);
    expect(componentLineMap.size).toBe(0);
  });

  it('maps a single component to its line range', () => {
    const doc: LabelDocument = {
      ...baseDoc,
      components: [{
        id: 't1',
        name: 'Text',
        layout: { x: 10, y: 20, width: 100, height: 30, horizontalAnchor: 'left', verticalAnchor: 'top' },
        typeData: { type: 'text', props: { content: 'Hello', font: '0', fontSize: 30, fontWidth: 25, rotation: 0 } },
      }],
    };
    const { zpl, componentLineMap } = generateZplWithMap(doc);
    const lines = zpl.split('\n');
    const range = componentLineMap.get('t1');

    expect(range).toBeDefined();
    // First 3 lines are ^XA, ^PW, ^LL — component starts at line 3
    expect(range!.start).toBe(3);
    expect(range!.end).toBeGreaterThanOrEqual(range!.start);
    // Lines in range should contain component ZPL
    expect(lines[range!.start]).toContain('^FO');
    // Last line should be ^XZ
    expect(lines[lines.length - 1]).toBe('^XZ');
  });

  it('maps multiple components to non-overlapping ranges', () => {
    const doc: LabelDocument = {
      ...baseDoc,
      components: [
        {
          id: 't1',
          name: 'Text',
          layout: { x: 10, y: 10, width: 100, height: 30, horizontalAnchor: 'left', verticalAnchor: 'top' },
          typeData: { type: 'text', props: { content: 'First', font: '0', fontSize: 30, fontWidth: 25, rotation: 0 } },
        },
        {
          id: 'r1',
          name: 'Rect',
          layout: { x: 0, y: 0, width: 200, height: 100, horizontalAnchor: 'left', verticalAnchor: 'top' },
          typeData: { type: 'rectangle', props: { borderThickness: 3, cornerRadius: 0, filled: false } },
        },
      ],
    };
    const { componentLineMap } = generateZplWithMap(doc);

    const textRange = componentLineMap.get('t1')!;
    const rectRange = componentLineMap.get('r1')!;

    expect(textRange).toBeDefined();
    expect(rectRange).toBeDefined();
    // Text comes first, rect second — no overlap
    expect(textRange.end).toBeLessThan(rectRange.start);
  });

  it('zpl output matches generateZpl', () => {
    const doc: LabelDocument = {
      ...baseDoc,
      components: [{
        id: 't1',
        name: 'Text',
        layout: { x: 0, y: 0, width: 100, height: 30, horizontalAnchor: 'left', verticalAnchor: 'top' },
        typeData: { type: 'text', props: { content: 'Test', font: '0', fontSize: 20, fontWidth: 20, rotation: 0 } },
      }],
    };
    const { zpl } = generateZplWithMap(doc);
    expect(zpl).toBe(generateZpl(doc));
  });
});
