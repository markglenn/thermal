import type { LabelComponent, ComponentType, ComponentProperties, Constraints } from '../types';
import { getDefinition } from '../components';

let nextId = 1;

export function generateId(): string {
  return `comp_${nextId++}_${Date.now().toString(36)}`;
}

export function createComponent(
  type: ComponentType,
  constraintOverrides?: Partial<Constraints>
): LabelComponent {
  const def = getDefinition(type);
  return {
    id: generateId(),
    name: def.label,
    constraints: { ...def.defaultConstraints, ...constraintOverrides },
    pins: [],
    typeData: { type, props: structuredClone(def.defaultProps) } as ComponentProperties,
    children: def.traits.isContainer ? [] : undefined,
  };
}
