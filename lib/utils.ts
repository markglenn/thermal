import type { LabelComponent } from './types';

/** Find a component by ID in the flat list */
export function findComponent(
  components: LabelComponent[],
  id: string
): LabelComponent | null {
  for (const comp of components) {
    if (comp.id === id) return comp;
  }
  return null;
}
