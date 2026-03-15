import type { BarcodeProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { BarcodeElement } from './element';
import { BarcodeProperties as BarcodePropertiesPanel } from './properties';
import { barcodeCommand } from './zpl';

export const barcodeComponent: ComponentDefinition<BarcodeProperties> = {
  type: 'barcode',
  label: 'Barcode',
  icon: '║',
  traits: { autoSized: true, rotatable: true, isContainer: false },
  defaultConstraints: { left: 0, top: 0 },
  defaultProps: {
    content: '1234567890',
    encoding: 'code128',
    height: 80,
    showText: true,
    rotation: 0,
  },
  Element: BarcodeElement,
  PropertiesPanel: BarcodePropertiesPanel,
  generateZpl: barcodeCommand,
};
