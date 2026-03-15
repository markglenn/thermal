import type { ComponentDefinition, SizingMode } from './definition';
import type { LabelComponent } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<string, ComponentDefinition<any>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerComponent(def: ComponentDefinition<any>): void {
  registry.set(def.type, def);
}

export function getDefinition(type: string): ComponentDefinition {
  const def = registry.get(type);
  if (!def) throw new Error(`Unknown component type: ${type}`);
  return def;
}

export function getAllDefinitions(): ComponentDefinition[] {
  return Array.from(registry.values());
}

export function getSizingMode(component: LabelComponent): SizingMode {
  const def = registry.get(component.typeData.type);
  if (!def) return 'fixed';
  if (def.getSizingMode) return def.getSizingMode(component);
  return def.traits.autoSized ? 'auto' : 'fixed';
}
