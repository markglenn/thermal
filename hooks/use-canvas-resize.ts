import { useCallback } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';

export function useCanvasResize() {
  const resizeState = useEditorStore((s) => s.resizeState);
  const updateConstraints = useEditorStore((s) => s.updateConstraints);

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeState) return;

      const zoom = useEditorStore.getState().viewport.zoom;
      const dx = (e.clientX - resizeState.startX) / zoom;
      const dy = (e.clientY - resizeState.startY) / zoom;
      const sc = resizeState.startConstraints;
      const newConstraints = { ...sc };
      const handle = resizeState.handle;

      if (handle.includes('left')) {
        if (sc.left !== undefined) newConstraints.left = Math.round(sc.left + dx);
        if (sc.width !== undefined && sc.right === undefined) newConstraints.width = Math.round(Math.max(10, sc.width - dx));
      }
      if (handle.includes('right') || handle === 'right') {
        if (sc.right !== undefined) newConstraints.right = Math.round(sc.right - dx);
        if (sc.width !== undefined && sc.left !== undefined && sc.right === undefined) newConstraints.width = Math.round(Math.max(10, sc.width + dx));
      }

      if (handle.startsWith('top')) {
        if (sc.top !== undefined) newConstraints.top = Math.round(sc.top + dy);
        if (sc.height !== undefined && sc.bottom === undefined) newConstraints.height = Math.round(Math.max(10, sc.height - dy));
      }
      if (handle.includes('bottom')) {
        if (sc.bottom !== undefined) newConstraints.bottom = Math.round(sc.bottom - dy);
        if (sc.height !== undefined && sc.top !== undefined && sc.bottom === undefined) newConstraints.height = Math.round(Math.max(10, sc.height + dy));
      }

      updateConstraints(resizeState.componentId, newConstraints);
    },
    [resizeState, updateConstraints]
  );

  return { handleResizeMove, resizeState };
}
