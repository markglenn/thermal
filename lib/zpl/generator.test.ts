import { describe, it, expect } from 'vitest';
import { generateZpl, generateZplWithMap } from './generator';
import { generateRfidZpl } from './rfid';
import type { LabelDocument, RfidConfig } from '../types';

// Must import to register components before generateZpl uses getDefinition
import '../components';

describe('generateZpl', () => {
  const baseDoc: LabelDocument = {
    version: 1,
    label: { dpi: 203, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] },
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
      label: { dpi: 300, variants: [{ name: 'Default', widthDots: 1200, heightDots: 1800, unit: 'in' }] },
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
    label: { dpi: 203, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] },
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

describe('generateRfidZpl', () => {
  it('returns empty array when disabled', () => {
    const config: RfidConfig = {
      enabled: false, writeMode: 'epc', data: 'AABB', dataFormat: 'hex',
      memoryBank: 'epc', startBlock: 0, retries: 3, errorHandling: 'none',
    };
    expect(generateRfidZpl(config)).toEqual([]);
  });

  it('generates EPC write with ^RFW', () => {
    const config: RfidConfig = {
      enabled: true, writeMode: 'epc', data: '3034257BF4000000001234AB', dataFormat: 'hex',
      memoryBank: 'epc', startBlock: 0, retries: 3, errorHandling: 'none',
    };
    expect(generateRfidZpl(config)).toEqual([
      '^RS8,,N,3,N',
      '^RFW,H,1,0,12',
      '^FD3034257BF4000000001234AB^FS',
    ]);
  });

  it('generates raw hex write to user bank', () => {
    const config: RfidConfig = {
      enabled: true, writeMode: 'raw', data: 'AABBCCDD', dataFormat: 'hex',
      memoryBank: 'user', startBlock: 2, retries: 5, errorHandling: 'overstrike',
    };
    expect(generateRfidZpl(config)).toEqual([
      '^RS8,,N,5,O',
      '^RFW,H,3,2,4',
      '^FDAABBCCDD^FS',
    ]);
  });

  it('generates raw ascii write', () => {
    const config: RfidConfig = {
      enabled: true, writeMode: 'raw', data: 'HELLO', dataFormat: 'ascii',
      memoryBank: 'user', startBlock: 0, retries: 2, errorHandling: 'eject',
    };
    expect(generateRfidZpl(config)).toEqual([
      '^RS8,,N,2,E',
      '^RFW,A,3,0,5',
      '^FDHELLO^FS',
    ]);
  });

  it('uses override data when provided', () => {
    const config: RfidConfig = {
      enabled: true, writeMode: 'epc', data: 'default', dataFormat: 'hex',
      memoryBank: 'epc', startBlock: 0, retries: 0, errorHandling: 'none',
    };
    const result = generateRfidZpl(config, 'OVERRIDE');
    expect(result).toContain('^FDOVERRIDE^FS');
    expect(result.join('')).not.toContain('default');
  });

  it('only emits ^RS when data is empty', () => {
    const config: RfidConfig = {
      enabled: true, writeMode: 'epc', data: '', dataFormat: 'hex',
      memoryBank: 'epc', startBlock: 0, retries: 3, errorHandling: 'none',
    };
    expect(generateRfidZpl(config)).toEqual(['^RS8,,N,3,N']);
  });
});

describe('generateZpl with RFID', () => {
  const baseDoc: LabelDocument = {
    version: 1,
    label: { dpi: 203, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] },
    components: [],
  };

  it('includes RFID commands when rfid is enabled', () => {
    const doc: LabelDocument = {
      ...baseDoc,
      label: {
        ...baseDoc.label,
        rfid: {
          enabled: true, writeMode: 'epc', data: 'AABB', dataFormat: 'hex',
          memoryBank: 'epc', startBlock: 0, retries: 3, errorHandling: 'none',
        },
      },
    };
    const zpl = generateZpl(doc);
    expect(zpl).toContain('^RS8,,N,3,N');
    expect(zpl).toContain('^RFW,H,1,0,2');
    expect(zpl).toContain('^FDAABB^FS');
  });

  it('omits RFID commands when rfid is disabled', () => {
    const doc: LabelDocument = {
      ...baseDoc,
      label: {
        ...baseDoc.label,
        rfid: {
          enabled: false, writeMode: 'epc', data: 'AABB', dataFormat: 'hex',
          memoryBank: 'epc', startBlock: 0, retries: 3, errorHandling: 'none',
        },
      },
    };
    const zpl = generateZpl(doc);
    expect(zpl).not.toContain('^RS');
    expect(zpl).not.toContain('^RFW');
  });

  it('omits RFID commands when rfid is undefined', () => {
    const zpl = generateZpl(baseDoc);
    expect(zpl).not.toContain('^RS');
    expect(zpl).not.toContain('^RFW');
  });
});
