'use client';

import { useEffect } from 'react';
import { useEditorStoreApi } from '@/lib/store/editor-context';
import { useTabStore } from '@/lib/store/tab-store';
import { findComponent } from '@/lib/utils';
import { copyToClipboard, readClipboard } from '@/lib/store/clipboard';

// Custom events for actions that need complex async handling (save/open)
export const EDITOR_EVENTS = {
  SAVE: 'editor:save',
  SAVE_AS: 'editor:save-as',
  OPEN: 'editor:open',
} as const;

export function useKeyboardShortcuts() {
  const storeApi = useEditorStoreApi();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      const state = storeApi.getState();
      const { selectedComponentIds, removeComponent, duplicateComponent, updateLayout, selectAll } = state;

      // Undo/Redo work even when focused on inputs
      if (e.key === 'z' && mod && !e.shiftKey) {
        e.preventDefault();
        storeApi.temporal.getState().undo();
        return;
      }
      if ((e.key === 'z' && mod && e.shiftKey) ||
          (e.key === 'y' && mod)) {
        e.preventDefault();
        storeApi.temporal.getState().redo();
        return;
      }

      // Save / Save As / Open / New / Close — work even in inputs
      if (e.key === 's' && mod && !e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new Event(EDITOR_EVENTS.SAVE));
        return;
      }
      if (e.key === 's' && mod && e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new Event(EDITOR_EVENTS.SAVE_AS));
        return;
      }
      if (e.key === 'o' && mod) {
        e.preventDefault();
        window.dispatchEvent(new Event(EDITOR_EVENTS.OPEN));
        return;
      }
      if (e.key === 'n' && mod) {
        e.preventDefault();
        useTabStore.getState().createTab();
        return;
      }
      if (e.key === 'w' && mod) {
        e.preventDefault();
        const tabState = useTabStore.getState();
        const tab = tabState.tabs.find((t) => t.id === tabState.activeTabId);
        if (tab?.dirty) {
          if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
        }
        tabState.closeTab(tabState.activeTabId);
        return;
      }

      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      // Toggle rulers (Shift+R)
      if (e.key === 'R' && e.shiftKey && !mod) {
        e.preventDefault();
        state.toggleRulers();
        return;
      }

      // In read-only mode, only allow copy (not cut, paste, delete, duplicate, nudge)
      const { readOnly } = state;

      // Copy
      if (e.key === 'c' && mod && selectedComponentIds.length > 0) {
        e.preventDefault();
        const components = selectedComponentIds
          .map((id) => findComponent(state.document.components, id))
          .filter((c): c is NonNullable<typeof c> => c !== null);
        if (components.length > 0) copyToClipboard(components);
        return;
      }

      // All remaining shortcuts mutate — block in read-only mode
      if (readOnly) return;

      // Cut
      if (e.key === 'x' && mod && selectedComponentIds.length > 0) {
        e.preventDefault();
        const components = selectedComponentIds
          .map((id) => findComponent(state.document.components, id))
          .filter((c): c is NonNullable<typeof c> => c !== null);
        if (components.length > 0) {
          copyToClipboard(components);
          [...selectedComponentIds].reverse().forEach((id) => removeComponent(id));
        }
        return;
      }

      // Paste
      if (e.key === 'v' && mod) {
        e.preventDefault();
        const clip = readClipboard();
        if (clip.length > 0) state.pasteComponents(clip);
        return;
      }

      // Select all
      if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        selectAll();
        return;
      }

      // Delete selected components
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponentIds.length > 0) {
        e.preventDefault();
        // Delete in reverse to avoid index shifting issues for siblings
        [...selectedComponentIds].reverse().forEach((id) => removeComponent(id));
        return;
      }

      // Duplicate
      if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey) && selectedComponentIds.length > 0) {
        e.preventDefault();
        selectedComponentIds.forEach((id) => duplicateComponent(id));
        return;
      }

      // Arrow keys to nudge selected components
      if (selectedComponentIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;

        for (const id of selectedComponentIds) {
          const comp = findComponent(state.document.components, id);
          if (comp) {
            const delta: { x?: number; y?: number } = {};
            if (e.key === 'ArrowLeft') delta.x = comp.layout.x - step;
            if (e.key === 'ArrowRight') delta.x = comp.layout.x + step;
            if (e.key === 'ArrowUp') delta.y = comp.layout.y - step;
            if (e.key === 'ArrowDown') delta.y = comp.layout.y + step;
            updateLayout(id, delta);
          }
        }
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [storeApi]);
}
