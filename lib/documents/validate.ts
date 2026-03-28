import type { LabelDocument } from '../types';

/** Validate that an unknown value has the shape of a LabelDocument. */
export function validateDocument(value: unknown): value is LabelDocument {
  if (typeof value !== 'object' || value === null) return false;
  const doc = value as Record<string, unknown>;

  if (doc.version !== 1) return false;

  // label
  if (typeof doc.label !== 'object' || doc.label === null) return false;
  const label = doc.label as Record<string, unknown>;
  if (label.dpi !== 203 && label.dpi !== 300 && label.dpi !== 600) return false;

  // Accept new variants format or legacy widthInches/heightInches format
  const hasVariants = 'variants' in label && Array.isArray(label.variants) && (label.variants as unknown[]).length > 0;
  const hasLegacy = typeof label.widthInches === 'number' && label.widthInches > 0
    && typeof label.heightInches === 'number' && label.heightInches > 0;
  if (!hasVariants && !hasLegacy) return false;

  // components
  if (!Array.isArray(doc.components)) return false;

  return true;
}
