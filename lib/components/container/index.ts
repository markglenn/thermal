import { Group } from 'lucide-react';
import type { ContainerProperties } from '@/lib/types';
import type { ComponentDefinition } from '../definition';
import { ContainerElement } from './element';
import { containerZpl } from './zpl';

export const containerComponent: ComponentDefinition<ContainerProperties> = {
  type: 'container',
  label: 'Container',
  icon: Group,
  traits: {
    autoSized: false,
    rotatable: false,
    isContainer: true,
    bindable: false,
  },
  defaultLayout: { x: 0, y: 0, width: 300, height: 200, horizontalAnchor: 'left', verticalAnchor: 'top' },
  defaultProps: {},
  Element: ContainerElement,
  PropertiesPanel: null,
  generateZpl: containerZpl,
};
