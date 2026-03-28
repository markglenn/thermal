import { useSyncExternalStore } from 'react';

function getIsMac(): boolean {
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

function subscribe() {
  // Platform never changes — no-op unsubscribe
  return () => {};
}

/** Hook that returns true on Mac. SSR-safe (defaults to true on server to match Mac symbols). */
export function useIsMac(): boolean {
  return useSyncExternalStore(subscribe, getIsMac, () => true);
}

/**
 * Format a shortcut string for the current platform.
 * Input uses Mac symbols: ⌘ (Cmd/Ctrl), ⇧ (Shift), ⌥ (Alt/Option)
 * On Windows/Linux, these are replaced with text equivalents.
 */
export function formatShortcut(shortcut: string, mac: boolean): string {
  if (mac) return shortcut;
  return shortcut
    .replace(/⌘/g, 'Ctrl+')
    .replace(/⇧/g, 'Shift+')
    .replace(/⌥/g, 'Alt+')
    .replace(/\+\+$/, '+');
}
