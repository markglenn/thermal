import { describe, it, expect } from 'vitest';
import { applyFieldData } from './generator-merge';
import type { LabelDocument, LabelComponent, ComponentLayout } from '../types';
// Register all components
import '../components';

function makeLayout(overrides: Partial<ComponentLayout> = {}): ComponentLayout {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    horizontalAnchor: 'left',
    verticalAnchor: 'top',
    ...overrides,
  };
}

function makeDoc(components: LabelComponent[]): LabelDocument {
  return {
    version: 1,
    label: { dpi: 203, activeVariant: 'Default', variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' as const }] },
    components,
  };
}

describe('applyFieldData', () => {
  it('substitutes text content', () => {
    const comp: LabelComponent = {
      id: 'text1',
      name: 'Name',
      layout: makeLayout({ width: 150, height: 30 }),
      fieldBinding: 'name',
      typeData: {
        type: 'text',
        props: {
          content: 'Short',
          font: '0',
          fontSize: 30,
          fontWidth: 12,
          rotation: 0,
        },
      },
    };

    const doc = makeDoc([comp]);
    const result = applyFieldData(doc, { name: 'Much Longer Name' });
    const updated = result.components[0];

    // Content should be substituted
    expect((updated.typeData.props as { content: string }).content).toBe('Much Longer Name');
    // Text uses DOM measurement — width is not recomputed server-side
    // (ZPL text positioning uses ^FO origin, width doesn't affect output)
    expect(updated.layout.width).toBe(150);
  });

  it('substitutes barcode content and recomputes size', () => {
    const comp: LabelComponent = {
      id: 'bc1',
      name: 'SKU',
      layout: makeLayout({ width: 200, height: 102 }),
      fieldBinding: 'sku',
      typeData: {
        type: 'barcode',
        props: {
          content: '123',
          encoding: 'code128' as const,
          height: 80,
          showText: true,
          rotation: 0,
        },
      },
    };

    const doc = makeDoc([comp]);
    const result = applyFieldData(doc, { sku: '123456789012' });
    const updated = result.components[0];

    expect((updated.typeData.props as { content: string }).content).toBe('123456789012');
    // Width should change: code128 = (12*11 + 35) * 2 = 334
    expect(updated.layout.width).toBe(334);
  });

  it('does not modify components without field binding', () => {
    const comp: LabelComponent = {
      id: 'static1',
      name: 'Static',
      layout: makeLayout({ width: 100, height: 30 }),
      typeData: {
        type: 'text',
        props: {
          content: 'Static Text',
          font: '0',
          fontSize: 30,
          fontWidth: 12,
          rotation: 0,
        },
      },
    };

    const doc = makeDoc([comp]);
    const result = applyFieldData(doc, { name: 'Something' });
    const updated = result.components[0];

    expect((updated.typeData.props as { content: string }).content).toBe('Static Text');
  });

  it('does not modify image components (async handled separately)', () => {
    const comp: LabelComponent = {
      id: 'img1',
      name: 'Photo',
      layout: makeLayout({ width: 200, height: 200 }),
      fieldBinding: 'photo',
      typeData: {
        type: 'image',
        props: {
          data: 'data:image/png;base64,abc',
          originalWidth: 200,
          originalHeight: 200,
          objectFit: 'fit' as const,
          objectPosition: 'center' as const,
          threshold: 128,
          invert: false,
          monochromeMethod: 'threshold' as const,
          monochromePreview: '',
          monochromePreviewFull: '',
          zplHex: '',
          zplBytesPerRow: 0,
          zplWidth: 0,
          zplHeight: 0,
        },
      },
    };

    const doc = makeDoc([comp]);
    const result = applyFieldData(doc, { photo: 'https://example.com/photo.png' });
    const updated = result.components[0];

    // Image data should NOT be modified by applyFieldData
    expect((updated.typeData.props as { data: string }).data).toBe('data:image/png;base64,abc');
  });

  it('center-anchored barcode reflows position when content changes', () => {
    // A barcode centered on a 406-dot wide label (2" @ 203 DPI)
    const comp: LabelComponent = {
      id: 'bc1',
      name: 'SKU',
      layout: makeLayout({
        x: 0,
        width: 200,
        height: 102,
        horizontalAnchor: 'center',
      }),
      fieldBinding: 'sku',
      typeData: {
        type: 'barcode',
        props: {
          content: '123',
          encoding: 'code128' as const,
          height: 80,
          showText: true,
          rotation: 0,
        },
      },
    };

    const doc = makeDoc([comp]);
    const result = applyFieldData(doc, { sku: '123456789012' });
    const updated = result.components[0];

    // Width recomputed to 334
    expect(updated.layout.width).toBe(334);
    // x stays at 0 (centered), but resolved position changes due to wider width
    expect(updated.layout.x).toBe(0);
    expect(updated.layout.horizontalAnchor).toBe('center');
  });

  it('returns a deep clone — original document is not mutated', () => {
    const comp: LabelComponent = {
      id: 'text1',
      name: 'Name',
      layout: makeLayout({ width: 60, height: 30 }),
      fieldBinding: 'name',
      typeData: {
        type: 'text',
        props: { content: 'Hi', font: '0', fontSize: 30, fontWidth: 12, rotation: 0 },
      },
    };

    const doc = makeDoc([comp]);
    const originalContent = (doc.components[0].typeData.props as { content: string }).content;

    applyFieldData(doc, { name: 'Hello World' });

    // Original should be unchanged
    expect((doc.components[0].typeData.props as { content: string }).content).toBe(originalContent);
  });
});
