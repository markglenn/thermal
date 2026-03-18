import { Minus } from 'lucide-react';
import type { LineProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { LineElement } from './element';
import { LinePropertiesPanel } from './properties';
import { lineZpl } from './zpl';

export const lineComponent: ComponentDefinition<LineProperties> = {
  type: 'line',
  label: 'Line',
  icon: Minus,
  traits: {
    autoSized: false,
    rotatable: false,
    bindable: false,
  },
  defaultLayout: { x: 0, y: 0, width: 200, height: 2, horizontalAnchor: 'left', verticalAnchor: 'top' },
  defaultProps: {
    thickness: 2,
    orientation: 'horizontal',
  },
  Element: LineElement,
  PropertiesPanel: LinePropertiesPanel,
  generateZpl: lineZpl,
};
