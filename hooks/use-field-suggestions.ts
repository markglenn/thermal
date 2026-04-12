import { useDocument } from '@/lib/store/editor-context';

/**
 * Collects all known field names from:
 * 1. Component fieldBinding values
 * 2. Document variable names
 * 3. RFID fieldBinding (if set)
 * 4. External bankFields argument
 *
 * Returns a deduplicated, sorted string[].
 */
export function useFieldSuggestions(bankFields: string[]): string[] {
  const doc = useDocument();

  const names = new Set<string>();

  // Component field bindings
  for (const c of doc.components) {
    if (c.fieldBinding) names.add(c.fieldBinding);
  }

  // Document variables
  if (doc.variables) {
    for (const v of doc.variables) {
      names.add(v.name);
    }
  }

  // RFID field binding
  if (doc.label.rfid?.fieldBinding) {
    names.add(doc.label.rfid.fieldBinding);
  }

  // Bank fields
  for (const f of bankFields) {
    names.add(f);
  }

  return Array.from(names).sort();
}
