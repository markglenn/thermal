import type { RectangleProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { RectangleElement } from './element';
import { RectanglePropertiesPanel } from './properties';
import { rectangleZpl } from './zpl';

export const rectangleComponent: ComponentDefinition<RectangleProperties> = {
  type: 'rectangle',
  label: 'Rectangle',
  icon: '\u25A1',
  traits: {
    autoSized: false,
    rotatable: false,
    isContainer: false,
  },
  defaultConstraints: { left: 0, top: 0, width: 150, height: 100 },
  defaultProps: {
    borderThickness: 2,
    cornerRadius: 0,
    filled: false,
  },
  Element: RectangleElement,
  PropertiesPanel: RectanglePropertiesPanel,
  generateZpl: rectangleZpl,
};
