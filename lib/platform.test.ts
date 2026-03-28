import { describe, it, expect } from 'vitest';
import { formatShortcut } from './platform';

describe('formatShortcut', () => {
  it('returns mac symbols unchanged on mac', () => {
    expect(formatShortcut('⌘S', true)).toBe('⌘S');
    expect(formatShortcut('⌘⇧Z', true)).toBe('⌘⇧Z');
    expect(formatShortcut('⌘+', true)).toBe('⌘+');
  });

  it('converts to Ctrl/Shift/Alt on non-mac', () => {
    expect(formatShortcut('⌘S', false)).toBe('Ctrl+S');
    expect(formatShortcut('⌘⇧S', false)).toBe('Ctrl+Shift+S');
    expect(formatShortcut('⌥N', false)).toBe('Alt+N');
  });

  it('handles zoom shortcut without double plus', () => {
    expect(formatShortcut('⌘+', false)).toBe('Ctrl+');
  });

  it('passes through non-modifier keys unchanged', () => {
    expect(formatShortcut('Delete', false)).toBe('Delete');
    expect(formatShortcut('↑↓←→', true)).toBe('↑↓←→');
    expect(formatShortcut('Space + Drag', false)).toBe('Space + Drag');
  });
});
