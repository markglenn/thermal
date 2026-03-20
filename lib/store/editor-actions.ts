import type { LabelComponent, ComponentType, ComponentProperties, ComponentLayout } from '../types';
import { getDefinition } from '../components';

export function generateId(): string {
  return crypto.randomUUID();
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
