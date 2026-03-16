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
  },
  defaultConstraints: { left: 0, top: 0, width: 300, height: 200 },
  defaultProps: {},
  Element: ContainerElement,
  PropertiesPanel: null,
  generateZpl: containerZpl,
};
