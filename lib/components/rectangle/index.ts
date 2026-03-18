import { Square } from 'lucide-react';
import type { RectangleProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { RectangleElement } from './element';
import { RectanglePropertiesPanel } from './properties';
import { rectangleZpl } from './zpl';

export const rectangleComponent: ComponentDefinition<RectangleProperties> = {
  type: 'rectangle',
  label: 'Rectangle',
  icon: Square,
  traits: {
    autoSized: false,
    rotatable: false,
    isContainer: false,
    bindable: false,
  },
  defaultLayout: { x: 0, y: 0, width: 150, height: 100, horizontalAnchor: 'left', verticalAnchor: 'top' },
  defaultProps: {
    borderThickness: 2,
    cornerRadius: 0,
    filled: false,
  },
  Element: RectangleElement,
  PropertiesPanel: RectanglePropertiesPanel,
  generateZpl: rectangleZpl,
};
