import type { LabelComponent, ComponentType, ComponentProperties, Constraints } from '../types';
import {
  DEFAULT_COMPONENT_CONSTRAINTS,
  DEFAULT_TEXT_PROPS,
  DEFAULT_BARCODE_PROPS,
  DEFAULT_QRCODE_PROPS,
  DEFAULT_LINE_PROPS,
  DEFAULT_RECTANGLE_PROPS,
} from '../constants';

let nextId = 1;

export function generateId(): string {
  return `comp_${nextId++}_${Date.now().toString(36)}`;
}

export function getDefaultTypeData(type: ComponentType): ComponentProperties {
  switch (type) {
    case 'text':
      return { type: 'text', props: { ...DEFAULT_TEXT_PROPS } };
    case 'barcode':
      return { type: 'barcode', props: { ...DEFAULT_BARCODE_PROPS } };
    case 'qrcode':
      return { type: 'qrcode', props: { ...DEFAULT_QRCODE_PROPS } };
    case 'image':
      return { type: 'image', props: { data: '', originalWidth: 200, originalHeight: 200 } };
    case 'line':
      return { type: 'line', props: { ...DEFAULT_LINE_PROPS } };
    case 'rectangle':
      return { type: 'rectangle', props: { ...DEFAULT_RECTANGLE_PROPS } };
    case 'container':
      return { type: 'container', props: {} };
  }
}

export function createComponent(
  type: ComponentType,
  constraintOverrides?: Partial<Constraints>
): LabelComponent {
  const defaults = DEFAULT_COMPONENT_CONSTRAINTS[type];
  return {
    id: generateId(),
    name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
    constraints: { ...defaults, ...constraintOverrides },
    pins: [],
    typeData: getDefaultTypeData(type),
    children: type === 'container' ? [] : undefined,
  };
}
