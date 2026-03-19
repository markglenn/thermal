import { FileBarChart2 } from 'lucide-react';
import type { Pdf417Properties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { Pdf417Element } from './element';
import { Pdf417PropertiesPanel } from './properties';
import { pdf417Zpl } from './zpl';

export const pdf417Component: ComponentDefinition<Pdf417Properties> = {
  type: 'pdf417',
  label: 'PDF417',
  icon: FileBarChart2,
  traits: { autoSized: true, rotatable: false, bindable: true },
  defaultLayout: { x: 0, y: 0, width: 0, height: 0, horizontalAnchor: 'left', verticalAnchor: 'top' },
  defaultProps: {
    content: '1234567890',
    columns: 3,
    securityLevel: 2,
    rowHeight: 10,
  },
  Element: Pdf417Element,
  PropertiesPanel: Pdf417PropertiesPanel,
  generateZpl: pdf417Zpl,
};
