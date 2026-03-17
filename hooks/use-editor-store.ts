import { useEditorStore } from '@/lib/store/editor-store';
import { useShallow } from 'zustand/shallow';

// Convenience selectors
export function useSelectedComponent() {
  return useEditorStore((s) => {
    if (s.selectedComponentIds.length !== 1) return null;
    const id = s.selectedComponentIds[0];
    function find(components: typeof s.document.components): typeof s.document.components[0] | null {
      for (const c of components) {
        if (c.id === id) return c;
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
