import { Circle } from 'lucide-react';
import type { EllipseProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { EllipseElement } from './element';
import { EllipsePropertiesPanel } from './properties';
import { ellipseZpl } from './zpl';

export const ellipseComponent: ComponentDefinition<EllipseProperties> = {
  type: 'ellipse',
  label: 'Ellipse',
  icon: Circle,
  traits: {
    autoSized: false,
    rotatable: false,
    bindable: false,
  },
  defaultLayout: { x: 0, y: 0, width: 100, height: 100, horizontalAnchor: 'left', verticalAnchor: 'top' },
  defaultProps: {
    borderThickness: 2,
    filled: false,
    circle: false,
  },
  Element: EllipseElement,
  PropertiesPanel: EllipsePropertiesPanel,
  generateZpl: ellipseZpl,
  constrainSize: (props, _currentLayout, change) => {
    if (!props.circle) return change;
    // In circle mode, keep width and height equal
    const size = change.width ?? change.height;
    if (size === undefined) return change;
    return { width: size, height: size };
  },
};
