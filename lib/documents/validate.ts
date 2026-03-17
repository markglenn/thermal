import type { LabelDocument } from '../types';

/** Validate that an unknown value has the shape of a LabelDocument. */
export function validateDocument(value: unknown): value is LabelDocument {
  if (typeof value !== 'object' || value === null) return false;
  const doc = value as Record<string, unknown>;

  if (doc.version !== 1) return false;

  // label
  if (typeof doc.label !== 'object' || doc.label === null) return false;
  const label = doc.label as Record<string, unknown>;
  if (typeof label.widthInches !== 'number' || label.widthInches <= 0) return false;
  if (typeof label.heightInches !== 'number' || label.heightInches <= 0) return false;
  if (label.dpi !== 203 && label.dpi !== 300 && label.dpi !== 600) return false;

  // components
  if (!Array.isArray(doc.components)) return false;

  return true;
}
