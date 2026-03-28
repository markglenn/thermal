/** Returns true if the user is on macOS */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return true;
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * Format a shortcut string for the current platform.
 * Input uses Mac symbols: ⌘ (Cmd/Ctrl), ⇧ (Shift), ⌥ (Alt/Option)
 * On Windows/Linux, these are replaced with text equivalents.
 */
export function formatShortcut(shortcut: string): string {
  if (isMac()) return shortcut;
  return shortcut
    .replace(/⌘/g, 'Ctrl+')
    .replace(/⇧/g, 'Shift+')
    .replace(/⌥/g, 'Alt+')
    // Clean up double ++ from e.g. "Ctrl++" → "Ctrl+"
    .replace(/\+\+$/, '+')
    // Clean up trailing + before single char keys (e.g. "Ctrl+S" is fine, but "Ctrl+" from "⌘+" needs to stay)
    ;
}
