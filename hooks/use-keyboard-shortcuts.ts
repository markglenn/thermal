'use client';

import { useEffect } from 'react';
import { useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';

export function useKeyboardShortcuts() {
  const storeApi = useEditorStoreApi();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const state = storeApi.getState();
      const { selectedComponentIds, removeComponent, duplicateComponent, updateConstraints, selectAll } = state;

      // Undo/Redo work even when focused on inputs
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        storeApi.temporal.getState().undo();
        return;
      }
      if ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
          (e.key === 'y' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        storeApi.temporal.getState().redo();
        return;
      }

      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

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
        const delta = {
          ArrowUp: { top: -step },
          ArrowDown: { top: step },
          ArrowLeft: { left: -step },
          ArrowRight: { left: step },
        }[e.key] as Record<string, number>;

        for (const id of selectedComponentIds) {
          const comp = findComponent(state.document.components, id);
          if (comp) {
            const updates: Record<string, number> = {};
            for (const [key, val] of Object.entries(delta)) {
              const current = comp.constraints[key as keyof typeof comp.constraints];
              if (current !== undefined) {
                updates[key] = current + val;
              }
            }
            if (Object.keys(updates).length > 0) {
              updateConstraints(id, updates);
            }
          }
        }
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
