import { describe, it, expect } from 'vitest';
import { generateZpl } from './generator';
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
        constraints: { left: 10, top: 20, width: 100, height: 30 },
        pins: [],
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
        constraints: { left: 0, top: 0, width: 200, height: 100 },
        pins: [],
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

  it('generates ZPL for nested container with child', () => {
    const doc: LabelDocument = {
      ...baseDoc,
      components: [{
        id: 'c1',
        name: 'Container',
        constraints: { left: 50, top: 50, width: 200, height: 100 },
        pins: [],
        typeData: { type: 'container', props: {} },
        children: [{
          id: 't1',
          name: 'Text',
          constraints: { left: 10, top: 10, width: 80, height: 30 },
          pins: [],
          typeData: {
            type: 'text',
            props: {
              content: 'Nested',
              font: '0',
              fontSize: 20,
              fontWidth: 20,
              rotation: 0,
            },
          },
        }],
      }],
    };
    const zpl = generateZpl(doc);
    // Child should be offset by parent position: 50+10=60, 50+10=60
    expect(zpl).toContain('^FO60,60');
    expect(zpl).toContain('^FDNested^FS');
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
