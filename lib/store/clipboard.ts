import type { LabelComponent } from '../types';

/**
 * Module-level clipboard for component copy/paste.
 * Shared across all tabs — copying in one tab and pasting in another works.
 * Stores deep-cloned snapshots so mutations don't affect the clipboard.
 */
let clipboard: LabelComponent[] = [];

export function copyToClipboard(components: LabelComponent[]): void {
  clipboard = structuredClone(components);
}

export function readClipboard(): LabelComponent[] {
  return clipboard;
}

export function hasClipboardContent(): boolean {
  return clipboard.length > 0;
}
