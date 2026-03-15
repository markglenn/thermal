import type { LabelComponent, ComponentType } from './types';

/** Recursively find a component by ID in the tree */
export function findComponent(
  components: LabelComponent[],
  id: string
): LabelComponent | null {
  for (const comp of components) {
    if (comp.id === id) return comp;
    if (comp.children) {
      const found = findComponent(comp.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Component types that auto-size from content (no user-set width/height) */
export const AUTO_SIZED_TYPES = new Set<ComponentType>(['text', 'barcode', 'qrcode']);

/** Check if a component is auto-sized (no field block override) */
export function isAutoSized(component: LabelComponent): boolean {
  if (!AUTO_SIZED_TYPES.has(component.typeData.type)) return false;
  // Text with field block has a constraint-driven width
  if (component.typeData.type === 'text' && component.typeData.props.fieldBlock) return false;
  return true;
}

/** Check if a text component has field block enabled */
export function hasFieldBlock(component: LabelComponent): boolean {
  return component.typeData.type === 'text' && !!component.typeData.props.fieldBlock;
}
