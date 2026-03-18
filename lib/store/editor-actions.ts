import type { LabelComponent, ComponentType, ComponentProperties, ComponentLayout } from '../types';
import { getDefinition } from '../components';

let nextId = 1;

export function generateId(): string {
  return `comp_${nextId++}_${Date.now().toString(36)}`;
}

export function createComponent(
  type: ComponentType,
  layoutOverrides?: Partial<ComponentLayout>
): LabelComponent {
  const def = getDefinition(type);
  return {
    id: generateId(),
    name: def.label,
    layout: { ...def.defaultLayout, ...layoutOverrides },
    typeData: { type, props: structuredClone(def.defaultProps) } as ComponentProperties,
  };
}
