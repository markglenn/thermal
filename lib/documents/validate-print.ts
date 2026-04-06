import type { ValidationError, ValidationResult } from './validate';

// ---------------------------------------------------------------------------
// Print request limits
// ---------------------------------------------------------------------------

/** Maximum number of data rows per print request. */
export const MAX_PRINT_ROWS = 10_000;

/** Maximum length of any single field value string. */
export const MAX_FIELD_VALUE_LENGTH = 10_000;

/** Maximum number of fields per data row. */
export const MAX_FIELDS_PER_ROW = 100;

/** Maximum copy count per print request. */
export const MAX_COPIES = 1_000;

// ---------------------------------------------------------------------------
// Print request shape
// ---------------------------------------------------------------------------

export interface PrintRequest {
  data: Record<string, string>[];
  printer?: string;
  copies: number;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/** Validate and parse a print request body. Returns structured errors or the parsed request. */
export function validatePrintRequest(body: unknown): ValidationResult & { parsed?: PrintRequest } {
  const errors: ValidationError[] = [];

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    errors.push({ path: 'body', message: 'must be an object' });
    return { valid: false, errors };
  }

  const obj = body as Record<string, unknown>;

  // --- data ---
  if (!Array.isArray(obj.data) || obj.data.length === 0) {
    errors.push({ path: 'data', message: 'must be a non-empty array' });
    return { valid: false, errors };
  }

  const data = obj.data as unknown[];
  if (data.length > MAX_PRINT_ROWS) {
    errors.push({ path: 'data', message: `exceeds max rows (${MAX_PRINT_ROWS})` });
    return { valid: false, errors };
  }

  const parsedData: Record<string, string>[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      errors.push({ path: `data[${i}]`, message: 'must be an object' });
      continue;
    }

    const entries = Object.entries(row as Record<string, unknown>);
    if (entries.length > MAX_FIELDS_PER_ROW) {
      errors.push({ path: `data[${i}]`, message: `exceeds max fields per row (${MAX_FIELDS_PER_ROW})` });
      continue;
    }

    const parsedRow: Record<string, string> = {};
    for (const [key, val] of entries) {
      if (typeof val !== 'string') {
        errors.push({ path: `data[${i}].${key}`, message: 'must be a string' });
        continue;
      }
      if (val.length > MAX_FIELD_VALUE_LENGTH) {
        errors.push({ path: `data[${i}].${key}`, message: `exceeds max length (${MAX_FIELD_VALUE_LENGTH})` });
        continue;
      }
      parsedRow[key] = val;
    }
    parsedData.push(parsedRow);
  }

  // --- printer ---
  let printer: string | undefined;
  if (obj.printer !== undefined) {
    if (typeof obj.printer !== 'string') {
      errors.push({ path: 'printer', message: 'must be a string' });
    } else if (obj.printer.length === 0) {
      errors.push({ path: 'printer', message: 'must not be empty' });
    } else {
      printer = obj.printer;
    }
  }

  // --- copies ---
  let copies = 1;
  if (obj.copies !== undefined) {
    if (typeof obj.copies !== 'number' || obj.copies < 1) {
      errors.push({ path: 'copies', message: 'must be a number >= 1' });
    } else if (obj.copies > MAX_COPIES) {
      errors.push({ path: 'copies', message: `exceeds max copies (${MAX_COPIES})` });
    } else {
      copies = Math.floor(obj.copies);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    parsed: { data: parsedData, printer, copies },
  };
}
