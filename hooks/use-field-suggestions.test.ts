import { describe, it, expect } from 'vitest';
import type { LabelDocument, LabelComponent } from '@/lib/types';

// Test the merging logic directly (same as what useFieldSuggestions computes)
function collectFieldNames(doc: LabelDocument, bankFields: string[]): string[] {
  const names = new Set<string>();

  for (const c of doc.components) {
    if (c.fieldBinding) names.add(c.fieldBinding);
  }

  if (doc.variables) {
    for (const v of doc.variables) {
      names.add(v.name);
    }
  }

  if (doc.label.rfid?.fieldBinding) {
    names.add(doc.label.rfid.fieldBinding);
  }

  for (const f of bankFields) {
    names.add(f);
  }

  return Array.from(names).sort();
}

function makeComponent(id: string, fieldBinding?: string): LabelComponent {
  return {
    id,
    name: id,
    layout: { x: 0, y: 0, width: 100, height: 40, horizontalAnchor: 'left', verticalAnchor: 'top' },
    typeData: { type: 'text', props: { content: '', font: 'A', fontSize: 30, fontWidth: 30, rotation: 0 } },
    fieldBinding,
  };
}

function makeDoc(overrides?: Partial<LabelDocument>): LabelDocument {
  return {
    version: 1,
    label: { dpi: 203, variants: [{ name: 'default', widthDots: 406, heightDots: 203, unit: 'in' }] },
    components: [],
    ...overrides,
  };
}

describe('collectFieldNames (useFieldSuggestions logic)', () => {
  it('returns empty array for empty document and no bank fields', () => {
    expect(collectFieldNames(makeDoc(), [])).toEqual([]);
  });

  it('collects component field bindings', () => {
    const doc = makeDoc({
      components: [makeComponent('a', 'orderId'), makeComponent('b', 'sku'), makeComponent('c')],
    });
    expect(collectFieldNames(doc, [])).toEqual(['orderId', 'sku']);
  });

  it('collects variable names', () => {
    const doc = makeDoc({
      variables: [
        { name: 'dateField', type: 'date', defaultValue: '', format: 'YYYY-MM-DD' },
        { name: 'counter1', type: 'counter', defaultValue: '', counter: { start: 1, increment: 1, padding: 5, prefix: '', suffix: '' } },
      ],
    });
    expect(collectFieldNames(doc, [])).toEqual(['counter1', 'dateField']);
  });

  it('collects RFID field binding', () => {
    const doc = makeDoc({
      label: {
        dpi: 203,
        variants: [{ name: 'default', widthDots: 406, heightDots: 203, unit: 'in' }],
        rfid: {
          enabled: true,
          writeMode: 'epc',
          data: '',
          fieldBinding: 'rfidTag',
          dataFormat: 'hex',
          memoryBank: 'epc',
          startBlock: 0,
          retries: 3,
          errorHandling: 'none',
        },
      },
    });
    expect(collectFieldNames(doc, [])).toEqual(['rfidTag']);
  });

  it('includes bank fields', () => {
    expect(collectFieldNames(makeDoc(), ['partNumber', 'lotCode'])).toEqual(['lotCode', 'partNumber']);
  });

  it('deduplicates across all sources', () => {
    const doc = makeDoc({
      components: [makeComponent('a', 'orderId')],
      variables: [{ name: 'orderId', type: 'text', defaultValue: '' }],
    });
    expect(collectFieldNames(doc, ['orderId'])).toEqual(['orderId']);
  });

  it('sorts alphabetically', () => {
    const doc = makeDoc({
      components: [makeComponent('a', 'zebra'), makeComponent('b', 'alpha')],
    });
    expect(collectFieldNames(doc, ['middle'])).toEqual(['alpha', 'middle', 'zebra']);
  });
});
