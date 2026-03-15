import { useEditorStore } from '@/lib/store/editor-store';
import type { EditorStore } from '@/lib/store/editor-store';
import { useShallow } from 'zustand/shallow';

// Convenience selectors
export function useSelectedComponent() {
  return useEditorStore((s) => {
    if (!s.selectedComponentId) return null;
    function find(components: typeof s.document.components): typeof s.document.components[0] | null {
      for (const c of components) {
        if (c.id === s.selectedComponentId) return c;
        if (c.children) {
          const found = find(c.children);
          if (found) return found;
        }
      }
      return null;
    }
    return find(s.document.components);
  });
}

export function useDocument() {
  return useEditorStore((s) => s.document);
}

export function useViewport() {
  return useEditorStore(
    useShallow((s) => s.viewport)
  );
}

export function useLabelConfig() {
  return useEditorStore((s) => s.document.label);
}

export { useEditorStore };
