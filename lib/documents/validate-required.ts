import type { LabelDocument } from '../types';
import type { ValidationError } from './validate';

/**
 * Validate that every row in a print request provides non-empty values
 * for variables marked `required` on the label.
 */
export function validateRequiredFields(
  doc: LabelDocument,
  data: Record<string, string>[],
): ValidationError[] {
  const required = (doc.variables ?? []).filter((v) => v.required).map((v) => v.name);
  if (required.length === 0) return [];

  const errors: ValidationError[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (const field of required) {
      const value = row[field];
      if (typeof value !== 'string' || value.trim() === '') {
        errors.push({ path: `data[${i}].${field}`, message: 'required field is missing or empty' });
      }
    }
  }
  return errors;
}
