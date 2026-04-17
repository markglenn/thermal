/**
 * Emit a `^FD...^FS` field-data block that's safe against ZPL injection
 * from user-supplied values.
 *
 * ZPL treats `^` (format) and `~` (control) as command prefixes inside
 * `^FD` data. A user value like `^XZ^XA` would otherwise terminate the
 * current label and start a new one. We defend by:
 *
 *  - If the value contains no special characters, emit `^FD{v}^FS` as
 *    before (common case, zero overhead).
 *  - Otherwise, enable field hex escaping (`^FH_`) and rewrite `^`, `~`,
 *    and `_` to their `_XX` hex escapes. `_` must also be escaped because
 *    we just made it the hex-escape prefix.
 *
 * `^FB` line breaks (`\&`) are intentionally not escaped — they are only
 * meaningful inside `^FB` blocks and a user can at worst add line breaks
 * inside their own text field.
 */
export function emitFieldData(value: string): string {
  if (!/[\^~]/.test(value)) {
    return `^FD${value}^FS`;
  }
  const escaped = value.replace(/[_^~]/g, (ch) => {
    return '_' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
  });
  return `^FH_^FD${escaped}^FS`;
}
