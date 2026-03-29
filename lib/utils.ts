import type { ConditionOperator, LabelComponent } from './types';

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string; needsValue: boolean }[] = [
  { value: 'isNotEmpty', label: 'is not empty', needsValue: false },
  { value: 'isEmpty', label: 'is empty', needsValue: false },
  { value: '==', label: 'equals', needsValue: true },
  { value: '!=', label: 'does not equal', needsValue: true },
];

export function formatOperator(op: ConditionOperator): string {
  return CONDITION_OPERATORS.find((o) => o.value === op)?.label ?? op;
}

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
