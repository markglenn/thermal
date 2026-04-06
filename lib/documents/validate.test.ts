import { describe, it, expect } from 'vitest';
import { validateDocument, validateDocumentDeep } from './validate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validComponent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'comp-1',
    name: 'Text 1',
    layout: {
      x: 10, y: 20, width: 100, height: 50,
      horizontalAnchor: 'left',
      verticalAnchor: 'top',
    },
    typeData: {
      type: 'text',
      props: {
        content: 'Hello',
        font: '0',
        fontSize: 30,
        fontWidth: 30,
        rotation: 0,
      },
    },
    ...overrides,
  };
}

function validDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 1,
    label: { dpi: 203, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] },
    components: [],
    ...overrides,
  };
}

function legacyDoc(): Record<string, unknown> {
  return {
    version: 1,
    label: { widthInches: 2, heightInches: 1, dpi: 203 },
    components: [],
  };
}

// ---------------------------------------------------------------------------
// validateDocument (boolean type guard — backward compat)
// ---------------------------------------------------------------------------

describe('validateDocument', () => {
  it('accepts a valid document with variants', () => {
    expect(validateDocument(validDoc())).toBe(true);
  });

  it('accepts a legacy document with widthInches/heightInches', () => {
    expect(validateDocument(legacyDoc())).toBe(true);
  });

  it('rejects null', () => {
    expect(validateDocument(null)).toBe(false);
  });

  it('rejects a string', () => {
    expect(validateDocument('not a document')).toBe(false);
  });

  it('rejects wrong version', () => {
    expect(validateDocument(validDoc({ version: 2 }))).toBe(false);
  });

  it('rejects missing label', () => {
    expect(validateDocument({ version: 1, components: [] })).toBe(false);
  });

  it('rejects invalid dpi', () => {
    expect(validateDocument(validDoc({
      label: { dpi: 150, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] },
    }))).toBe(false);
  });

  it('rejects non-positive legacy dimensions', () => {
    expect(validateDocument({ ...legacyDoc(), label: { widthInches: 0, heightInches: 1, dpi: 203 } })).toBe(false);
    expect(validateDocument({ ...legacyDoc(), label: { widthInches: 2, heightInches: -1, dpi: 203 } })).toBe(false);
  });

  it('rejects empty variants array', () => {
    expect(validateDocument(validDoc({ label: { dpi: 203, variants: [] } }))).toBe(false);
  });

  it('rejects label with no variants and no legacy fields', () => {
    expect(validateDocument({ version: 1, label: { dpi: 203 }, components: [] })).toBe(false);
  });

  it('rejects missing components', () => {
    expect(validateDocument({ version: 1, label: validDoc().label })).toBe(false);
  });

  it('rejects non-array components', () => {
    expect(validateDocument(validDoc({ components: 'nope' }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateDocumentDeep — structured errors
// ---------------------------------------------------------------------------

describe('validateDocumentDeep', () => {
  it('returns valid for a well-formed document with components', () => {
    const result = validateDocumentDeep(validDoc({ components: [validComponent()] }));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for a completely invalid value', () => {
    const result = validateDocumentDeep(42);
    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toBe('document');
  });

  // --- Component validation ---

  it('rejects component with missing id', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({ id: '' })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('id'))).toBe(true);
  });

  it('rejects component with missing name', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({ name: 123 })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('name'))).toBe(true);
  });

  it('rejects component with missing layout and constraints', () => {
    const comp = validComponent();
    delete (comp as Record<string, unknown>).layout;
    const result = validateDocumentDeep(validDoc({ components: [comp] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('layout'))).toBe(true);
  });

  it('accepts component with legacy constraints instead of layout', () => {
    const comp = validComponent();
    delete (comp as Record<string, unknown>).layout;
    (comp as Record<string, unknown>).constraints = { left: 10, top: 20, width: 100, height: 50 };
    const result = validateDocumentDeep(validDoc({ components: [comp] }));
    expect(result.valid).toBe(true);
  });

  it('rejects component with missing typeData', () => {
    const comp = validComponent();
    delete (comp as Record<string, unknown>).typeData;
    const result = validateDocumentDeep(validDoc({ components: [comp] }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('typeData'))).toBe(true);
  });

  it('rejects component with unknown type', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({ typeData: { type: 'sparkle', props: {} } })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('must be one of'))).toBe(true);
  });

  it('detects duplicate component IDs', () => {
    const result = validateDocumentDeep(validDoc({
      components: [
        validComponent({ id: 'dup' }),
        validComponent({ id: 'dup', name: 'Text 2' }),
      ],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('duplicate component id'))).toBe(true);
  });

  // --- Type-specific props ---

  it('rejects text component with invalid font', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: { type: 'text', props: { content: 'Hi', font: 'X', fontSize: 30, fontWidth: 30, rotation: 0 } },
      })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('font'))).toBe(true);
  });

  it('rejects text component with invalid rotation', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: { type: 'text', props: { content: 'Hi', font: '0', fontSize: 30, fontWidth: 30, rotation: 45 } },
      })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('rotation'))).toBe(true);
  });

  it('accepts text component with valid fieldBlock', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: {
          type: 'text',
          props: {
            content: 'Hi', font: '0', fontSize: 30, fontWidth: 30, rotation: 0,
            fieldBlock: { maxLines: 3, lineSpacing: 0, justification: 'L' },
          },
        },
      })],
    }));
    expect(result.valid).toBe(true);
  });

  it('rejects barcode with invalid encoding', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: { type: 'barcode', props: { content: '123', encoding: 'code256', height: 100, showText: true, rotation: 0 } },
      })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('encoding'))).toBe(true);
  });

  it('accepts valid qrcode component', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: { type: 'qrcode', props: { content: 'https://example.com', magnification: 5, errorCorrection: 'M' } },
      })],
    }));
    expect(result.valid).toBe(true);
  });

  it('rejects qrcode with invalid error correction', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: { type: 'qrcode', props: { content: 'test', magnification: 5, errorCorrection: 'X' } },
      })],
    }));
    expect(result.valid).toBe(false);
  });

  it('accepts valid datamatrix component', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: { type: 'datamatrix', props: { content: 'ABC', moduleSize: 4 } },
      })],
    }));
    expect(result.valid).toBe(true);
  });

  it('accepts valid pdf417 component', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: { type: 'pdf417', props: { content: 'data', columns: 3, securityLevel: 2, rowHeight: 10 } },
      })],
    }));
    expect(result.valid).toBe(true);
  });

  it('rejects line with invalid orientation', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: { type: 'line', props: { thickness: 2, orientation: 'diagonal' } },
      })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('orientation'))).toBe(true);
  });

  it('accepts valid rectangle component', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: { type: 'rectangle', props: { borderThickness: 2, cornerRadius: 5, filled: false } },
      })],
    }));
    expect(result.valid).toBe(true);
  });

  it('accepts valid ellipse component', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        typeData: { type: 'ellipse', props: { borderThickness: 2, filled: true, circle: false } },
      })],
    }));
    expect(result.valid).toBe(true);
  });

  // --- Layout validation ---

  it('rejects layout with invalid horizontal anchor', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        layout: { x: 0, y: 0, width: 100, height: 50, horizontalAnchor: 'middle', verticalAnchor: 'top' },
      })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('horizontalAnchor'))).toBe(true);
  });

  // --- Variables ---

  it('accepts document with valid variables', () => {
    const result = validateDocumentDeep(validDoc({
      variables: [
        { name: 'sku', type: 'text', defaultValue: '' },
        { name: 'serial', type: 'counter', defaultValue: '1', counter: { start: 1, increment: 1, padding: 5, prefix: 'SN-', suffix: '' } },
      ],
    }));
    expect(result.valid).toBe(true);
  });

  it('rejects variable with invalid type', () => {
    const result = validateDocumentDeep(validDoc({
      variables: [{ name: 'x', type: 'number', defaultValue: '0' }],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('type'))).toBe(true);
  });

  it('detects duplicate variable names', () => {
    const result = validateDocumentDeep(validDoc({
      variables: [
        { name: 'sku', type: 'text', defaultValue: '' },
        { name: 'sku', type: 'text', defaultValue: 'dup' },
      ],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('duplicate variable name'))).toBe(true);
  });

  // --- Visibility conditions ---

  it('accepts component with valid visibility condition', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        visibilityCondition: { field: 'sku', operator: '==', value: 'ABC' },
      })],
    }));
    expect(result.valid).toBe(true);
  });

  it('rejects visibility condition with invalid operator', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        visibilityCondition: { field: 'sku', operator: '>', value: '5' },
      })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('operator'))).toBe(true);
  });

  it('rejects visibility condition with empty field', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({
        visibilityCondition: { field: '', operator: 'isEmpty' },
      })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('field'))).toBe(true);
  });

  // --- Field binding ---

  it('accepts component with field binding', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({ fieldBinding: 'sku' })],
    }));
    expect(result.valid).toBe(true);
  });

  it('rejects non-string field binding', () => {
    const result = validateDocumentDeep(validDoc({
      components: [validComponent({ fieldBinding: 123 })],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('fieldBinding'))).toBe(true);
  });

  // --- Variant validation ---

  it('rejects variant with missing name', () => {
    const result = validateDocumentDeep(validDoc({
      label: { dpi: 203, variants: [{ name: '', widthDots: 406, heightDots: 203, unit: 'in' }] },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('name'))).toBe(true);
  });

  it('rejects variant with invalid unit', () => {
    const result = validateDocumentDeep(validDoc({
      label: { dpi: 203, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'cm' }] },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('unit'))).toBe(true);
  });

  it('rejects variant with zero width', () => {
    const result = validateDocumentDeep(validDoc({
      label: { dpi: 203, variants: [{ name: 'Default', widthDots: 0, heightDots: 203, unit: 'in' }] },
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path.includes('widthDots'))).toBe(true);
  });

  // --- Multiple errors ---

  it('collects multiple errors in a single pass', () => {
    const result = validateDocumentDeep({
      version: 2,
      label: { dpi: 999 },
      components: 'nope',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
