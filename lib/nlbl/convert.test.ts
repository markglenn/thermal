import { describe, it, expect } from 'vitest';
import { micronsToDots, convertNlblToDocument } from './convert';
import type { NlblParsedLabel } from './types';

describe('micronsToDots', () => {
  it('converts 4 inches (101600 microns) to 812 dots at 203 DPI', () => {
    // 4 inches = 101.6mm = 101600 microns
    expect(micronsToDots(101600, 203)).toBe(812);
  });

  it('converts 2 inches (50800 microns) to 406 dots at 203 DPI', () => {
    expect(micronsToDots(50800, 203)).toBe(406);
  });

  it('converts 1 inch (25400 microns) to 300 dots at 300 DPI', () => {
    expect(micronsToDots(25400, 300)).toBe(300);
  });

  it('returns 0 for 0 input', () => {
    expect(micronsToDots(0, 203)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    // 10000 microns at 203 DPI = (10000 / 25400) * 203 = 79.921... ≈ 80
    expect(micronsToDots(10000, 203)).toBe(80);
  });
});

describe('convertNlblToDocument', () => {
  function makeMinimalLabel(overrides?: Partial<NlblParsedLabel>): NlblParsedLabel {
    return {
      name: 'Test Label',
      media: { widthMicrons: 101600, heightMicrons: 101600 }, // 4" x 4"
      variables: [],
      textItems: [],
      barcodeItems: [],
      rectangleItems: [],
      lineItems: [],
      ...overrides,
    };
  }

  it('creates a valid document with correct label dimensions', () => {
    const doc = convertNlblToDocument(makeMinimalLabel());

    expect(doc.version).toBe(1);
    expect(doc.label.dpi).toBe(203);
    expect(doc.label.variants[0].widthDots).toBe(812);
    expect(doc.label.variants[0].heightDots).toBe(812);
    expect(doc.label.variants[0].unit).toBe('mm');
    expect(doc.components).toHaveLength(0);
  });

  it('converts a text item with fixed content', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      textItems: [{
        name: 'Title',
        left: 25400,  // 1 inch
        top: 12700,   // 0.5 inch
        width: 50800, // 2 inches
        height: 25400,
        content: 'Hello World',
        contentMask: '',
        fontName: 'Arial',
        fontPointSize: 14,
        fontWeight: 700,
        justification: 0,
        bestFit: false,
        zOrder: 10001,
        dataSourceId: null,
        anchoringPoint: 0,
      }],
    }));

    expect(doc.components).toHaveLength(1);
    const comp = doc.components[0];
    expect(comp.name).toBe('Title');
    expect(comp.typeData.type).toBe('text');
    expect(comp.layout.x).toBe(203); // 1 inch at 203 DPI
    expect(comp.layout.y).toBe(102); // 0.5 inch (12700/25400*203 = 101.5 rounds to 102)
    expect(comp.layout.horizontalAnchor).toBe('left');
    expect(comp.layout.verticalAnchor).toBe('top');
    expect(comp.fieldBinding).toBeUndefined();

    if (comp.typeData.type === 'text') {
      expect(comp.typeData.props.content).toBe('Hello World');
      expect(comp.typeData.props.font).toBe('0');
      expect(comp.typeData.props.rotation).toBe(0);
      // 14pt at 203 DPI = 14/72 * 203 ≈ 39
      expect(comp.typeData.props.fontSize).toBe(39);
    }
  });

  it('converts a text item bound to a variable', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      variables: [{
        id: 'var-1',
        name: 'serial_number',
        sampleValue: 'SN-12345',
        isRequired: true,
      }],
      textItems: [{
        name: 'Serial',
        left: 0,
        top: 0,
        width: 50800,
        height: 25400,
        content: 'Serial Number',
        contentMask: '',
        fontName: 'Arial',
        fontPointSize: 10,
        fontWeight: 0,
        justification: 0,
        bestFit: false,
        zOrder: 10001,
        dataSourceId: 'var-1',
        anchoringPoint: 0,
      }],
    }));

    const comp = doc.components[0];
    expect(comp.fieldBinding).toBe('serial_number');
    expect(comp.name).toBe('serial_number');
    if (comp.typeData.type === 'text') {
      // Variable-bound items use {} placeholder
      expect(comp.typeData.props.content).toBe('{}');
    }

    // Variable should be in the document
    expect(doc.variables).toHaveLength(1);
    expect(doc.variables![0].name).toBe('serial_number');
    expect(doc.variables![0].defaultValue).toBe('SN-12345');
  });

  it('converts a barcode item', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      barcodeItems: [{
        name: 'Barcode',
        x: 25400,   // 1 inch
        y: 50800,   // 2 inches
        barcodeType: 'Code128BarcodeData',
        moduleHeight: 12700, // 0.5 inch
        showText: true,
        content: '123456789012',
        zOrder: 10001,
        dataSourceId: null,
      }],
    }));

    expect(doc.components).toHaveLength(1);
    const comp = doc.components[0];
    expect(comp.typeData.type).toBe('barcode');
    expect(comp.layout.x).toBe(203);  // 1 inch
    expect(comp.layout.y).toBe(406);  // 2 inches

    if (comp.typeData.type === 'barcode') {
      expect(comp.typeData.props.encoding).toBe('code128');
      expect(comp.typeData.props.content).toBe('123456789012');
      expect(comp.typeData.props.height).toBe(102); // 0.5 inch (rounds up)
    }
  });

  it('sorts components by ZOrder', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      textItems: [
        {
          name: 'Second',
          left: 0, top: 0, width: 10000, height: 5000,
          content: 'B', contentMask: '', fontName: 'Arial', fontPointSize: 10,
          fontWeight: 0, justification: 0, bestFit: false,
          zOrder: 10002, dataSourceId: null, anchoringPoint: 0,
        },
        {
          name: 'First',
          left: 0, top: 10000, width: 10000, height: 5000,
          content: 'A', contentMask: '', fontName: 'Arial', fontPointSize: 10,
          fontWeight: 0, justification: 0, bestFit: false,
          zOrder: 10001, dataSourceId: null, anchoringPoint: 0,
        },
      ],
    }));

    expect(doc.components[0].name).toBe('First');
    expect(doc.components[1].name).toBe('Second');
  });

  it('maps text justification correctly', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      textItems: [{
        name: 'Centered',
        left: 0, top: 0, width: 50800, height: 25400,
        content: 'Center', contentMask: '', fontName: 'Arial', fontPointSize: 10,
        fontWeight: 0, justification: 2, bestFit: false,
        zOrder: 10001, dataSourceId: null, anchoringPoint: 0,
      }],
    }));

    const comp = doc.components[0];
    if (comp.typeData.type === 'text' && comp.typeData.props.fieldBlock) {
      expect(comp.typeData.props.fieldBlock.justification).toBe('C');
    }
  });

  it('cleans sample values with placeholder markers', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      variables: [
        { id: 'v1', name: 'empty_var', sampleValue: '??????', isRequired: false },
        { id: 'v2', name: 'wrapped_var', sampleValue: '<<some_value>>', isRequired: false },
        { id: 'v3', name: 'normal_var', sampleValue: 'hello', isRequired: false },
      ],
      textItems: [
        {
          name: 'T1', left: 0, top: 0, width: 10000, height: 5000,
          content: '', contentMask: '', fontName: 'Arial', fontPointSize: 10,
          fontWeight: 0, justification: 0, bestFit: false,
          zOrder: 10001, dataSourceId: 'v1', anchoringPoint: 0,
        },
        {
          name: 'T2', left: 0, top: 10000, width: 10000, height: 5000,
          content: '', contentMask: '', fontName: 'Arial', fontPointSize: 10,
          fontWeight: 0, justification: 0, bestFit: false,
          zOrder: 10002, dataSourceId: 'v2', anchoringPoint: 0,
        },
        {
          name: 'T3', left: 0, top: 20000, width: 10000, height: 5000,
          content: '', contentMask: '', fontName: 'Arial', fontPointSize: 10,
          fontWeight: 0, justification: 0, bestFit: false,
          zOrder: 10003, dataSourceId: 'v3', anchoringPoint: 0,
        },
      ],
    }));

    expect(doc.variables![0].defaultValue).toBe('');
    expect(doc.variables![1].defaultValue).toBe('some_value');
    expect(doc.variables![2].defaultValue).toBe('hello');
  });

  it('prepends contentMask to variable sample value', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      variables: [
        { id: 'v1', name: 'rack_id', sampleValue: '??????', isRequired: false },
      ],
      textItems: [{
        name: 'Rack Label',
        left: 0, top: 0, width: 25400, height: 5000,
        content: 'Text Box', contentMask: 'Rack ID:', fontName: 'Arial', fontPointSize: 14,
        fontWeight: 0, justification: 0, bestFit: false,
        zOrder: 10001, dataSourceId: 'v1', anchoringPoint: 0,
      }],
    }));

    const comp = doc.components[0];
    if (comp.typeData.type === 'text') {
      expect(comp.typeData.props.content).toBe('Rack ID:{}');
    }
  });

  it('respects custom DPI', () => {
    const doc = convertNlblToDocument(makeMinimalLabel(), 300);

    expect(doc.label.dpi).toBe(300);
    // 4 inches at 300 DPI = 1200 dots
    expect(doc.label.variants[0].widthDots).toBe(1200);
  });

  it('omits variables array when no variables are referenced', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      variables: [
        { id: 'v1', name: 'unused', sampleValue: 'test', isRequired: false },
      ],
      textItems: [{
        name: 'Static',
        left: 0, top: 0, width: 10000, height: 5000,
        content: 'Fixed text', contentMask: '', fontName: 'Arial', fontPointSize: 10,
        fontWeight: 0, justification: 0, bestFit: false,
        zOrder: 10001, dataSourceId: null, anchoringPoint: 0,
      }],
    }));

    expect(doc.variables).toBeUndefined();
  });

  it('converts a rectangle item', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      rectangleItems: [{
        name: 'Box',
        left: 2540,   // 0.1 inch
        top: 2540,
        width: 25400,  // 1 inch
        height: 12700, // 0.5 inch
        thickness: 254, // ~0.01 inch
        radius: 0,
        filled: false,
        zOrder: 10001,
      }],
    }));

    expect(doc.components).toHaveLength(1);
    const comp = doc.components[0];
    expect(comp.typeData.type).toBe('rectangle');
    expect(comp.layout.x).toBe(20);   // 0.1 inch at 203 DPI
    expect(comp.layout.y).toBe(20);
    expect(comp.layout.width).toBe(203);  // 1 inch
    expect(comp.layout.height).toBe(102); // 0.5 inch

    if (comp.typeData.type === 'rectangle') {
      expect(comp.typeData.props.borderThickness).toBe(2);
      expect(comp.typeData.props.cornerRadius).toBe(0);
      expect(comp.typeData.props.filled).toBe(false);
    }
  });

  it('converts a filled rectangle', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      rectangleItems: [{
        name: 'FilledBox',
        left: 0, top: 0, width: 25400, height: 25400,
        thickness: 127, radius: 2540, filled: true,
        zOrder: 10001,
      }],
    }));

    const comp = doc.components[0];
    if (comp.typeData.type === 'rectangle') {
      expect(comp.typeData.props.filled).toBe(true);
      expect(comp.typeData.props.cornerRadius).toBe(20);
    }
  });

  it('converts a vertical line', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      lineItems: [{
        name: 'VLine',
        startX: 12700,
        startY: 0,
        endX: 12700,
        endY: 25400,
        thickness: 254,
        zOrder: 10001,
      }],
    }));

    expect(doc.components).toHaveLength(1);
    const comp = doc.components[0];
    expect(comp.typeData.type).toBe('line');

    if (comp.typeData.type === 'line') {
      expect(comp.typeData.props.orientation).toBe('vertical');
      expect(comp.typeData.props.thickness).toBe(2);
    }
  });

  it('converts a horizontal line', () => {
    const doc = convertNlblToDocument(makeMinimalLabel({
      lineItems: [{
        name: 'HLine',
        startX: 0,
        startY: 12700,
        endX: 50800,
        endY: 12700,
        thickness: 127,
        zOrder: 10001,
      }],
    }));

    const comp = doc.components[0];
    if (comp.typeData.type === 'line') {
      expect(comp.typeData.props.orientation).toBe('horizontal');
    }
  });
});
