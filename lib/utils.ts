import type { LabelComponent } from './types';

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
