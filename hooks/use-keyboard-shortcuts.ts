'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const state = useEditorStore.getState();
      const { selectedComponentId, removeComponent, duplicateComponent, updateConstraints } = state;

      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      // Delete selected component
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponentId) {
        e.preventDefault();
        removeComponent(selectedComponentId);
        return;
      }

      // Duplicate
      if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey) && selectedComponentId) {
        e.preventDefault();
        duplicateComponent(selectedComponentId);
        return;
      }

      // Arrow keys to nudge selected component
      if (selectedComponentId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const delta = {
          ArrowUp: { top: -step },
          ArrowDown: { top: step },
          ArrowLeft: { left: -step },
          ArrowRight: { left: step },
        }[e.key] as Record<string, number>;

        // Find current component to get its constraints
        function find(comps: typeof state.document.components): typeof state.document.components[0] | null {
          for (const c of comps) {
            if (c.id === selectedComponentId) return c;
            if (c.children) { const f = find(c.children); if (f) return f; }
          }
          return null;
        }
        const comp = find(state.document.components);
        if (comp) {
          const updates: Record<string, number> = {};
          for (const [key, val] of Object.entries(delta)) {
            const current = comp.constraints[key as keyof typeof comp.constraints];
            if (current !== undefined) {
              updates[key] = current + val;
            }
          }
          if (Object.keys(updates).length > 0) {
            updateConstraints(selectedComponentId, updates);
          }
        }
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
