import type { LabelVariable } from '../types';

/**
 * Format a date using a simple format string.
 * Supported tokens: YYYY, YY, MM, DD, HH, mm, ss
 */
function formatDate(date: Date, format: string): string {
  const tokens: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    DD: String(date.getDate()).padStart(2, '0'),
    HH: String(date.getHours()).padStart(2, '0'),
    mm: String(date.getMinutes()).padStart(2, '0'),
    ss: String(date.getSeconds()).padStart(2, '0'),
  };
  let result = format;
  // Replace longest tokens first to avoid partial matches (YYYY before YY)
  for (const [token, value] of Object.entries(tokens).sort((a, b) => b[0].length - a[0].length)) {
    result = result.replaceAll(token, value);
  }
  return result;
}

/**
 * Resolve a counter variable to its string value.
 */
function resolveCounter(variable: LabelVariable, index: number): string {
  const c = variable.counter;
  if (!c) return variable.defaultValue;
  const value = c.start + c.increment * index;
  const padded = String(Math.abs(value)).padStart(c.padding, '0');
  const signed = value < 0 ? `-${padded}` : padded;
  return `${c.prefix}${signed}${c.suffix}`;
}

/**
 * Resolve all defined variables to their values.
 * - `text` variables use their defaultValue (overridden by fieldData at print time)
 * - `date` variables format the current date
 * - `counter` variables compute from start + increment * index
 *
 * @param variables - Variable definitions from the document
 * @param index - Label index in a batch (for counter increment)
 * @param now - Date to use (defaults to current time)
 */
export function resolveVariables(
  variables: LabelVariable[],
  index = 0,
  now = new Date(),
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const v of variables) {
    switch (v.type) {
      case 'text':
        result[v.name] = v.defaultValue;
        break;
      case 'date':
        result[v.name] = formatDate(now, v.format ?? 'YYYY-MM-DD');
        break;
      case 'counter':
        result[v.name] = resolveCounter(v, index);
        break;
    }
  }
  return result;
}

/**
 * Merge resolved variables with caller-supplied field data.
 * Field data takes precedence over resolved variables.
 */
export function mergeFieldData(
  variables: LabelVariable[],
  fieldData: Record<string, string>,
  index = 0,
): Record<string, string> {
  const resolved = resolveVariables(variables, index);
  return { ...resolved, ...fieldData };
}
