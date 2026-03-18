import { Barcode } from 'lucide-react';
import type { BarcodeProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { BarcodeElement } from './element';
import { BarcodeProperties as BarcodePropertiesPanel } from './properties';
import { barcodeCommand } from './zpl';
import { computeBarcodeSize } from './compute-size';

export const barcodeComponent: ComponentDefinition<BarcodeProperties> = {
  type: 'barcode',
  label: 'Barcode',
  icon: Barcode,
  traits: { autoSized: true, rotatable: true, isContainer: false, bindable: true },
  defaultLayout: { x: 0, y: 0, width: 100, height: 80, horizontalAnchor: 'left', verticalAnchor: 'top' },
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
  computeContentSize: computeBarcodeSize,
};
