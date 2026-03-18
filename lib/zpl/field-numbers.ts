import type { LabelComponent } from '../types';

export interface FieldMapping {
  fieldNumber: number;
  bindingName: string;
  componentId: string;
}

export interface FieldNumberMap {
  byComponentId: Map<string, number>;
  byBindingName: Map<string, number[]>;
  mappings: FieldMapping[];
}

/**
 * Assign ^FN field numbers (1-based) to components with fieldBindings.
 * Walks the tree in document order (same as ZPL generation).
 * Multiple components can share the same binding name — each gets its own field number.
 */
export function assignFieldNumbers(components: LabelComponent[]): FieldNumberMap {
  const byComponentId = new Map<string, number>();
  const byBindingName = new Map<string, number[]>();
  const mappings: FieldMapping[] = [];
  let nextNumber = 1;

  function walk(comps: LabelComponent[]) {
    for (const comp of comps) {
      if (comp.fieldBinding) {
        const fn = nextNumber++;
        byComponentId.set(comp.id, fn);

        const existing = byBindingName.get(comp.fieldBinding) ?? [];
        existing.push(fn);
        byBindingName.set(comp.fieldBinding, existing);

        mappings.push({
          fieldNumber: fn,
          bindingName: comp.fieldBinding,
          componentId: comp.id,
        });
      }
      if (comp.children) {
        walk(comp.children);
      }
    }
  }

  walk(components);
  return { byComponentId, byBindingName, mappings };
}
