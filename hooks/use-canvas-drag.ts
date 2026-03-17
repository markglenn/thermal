import { useCallback } from 'react';
import { useEditorStore, beginUndoBatch } from '@/lib/store/editor-store';
import { findComponent } from '@/lib/utils';
import type { Constraints } from '@/lib/types';

export function useCanvasDrag() {
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const setDragState = useEditorStore((s) => s.setDragState);
  const dragState = useEditorStore((s) => s.dragState);
  const updateConstraints = useEditorStore((s) => s.updateConstraints);

  const handleComponentPointerDown = useCallback(
    (e: React.PointerEvent, componentId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      selectComponent(componentId);

      const comp = findComponent(useEditorStore.getState().document.components, componentId);
      if (!comp) return;

      beginUndoBatch();
      setDragState({
        componentId,
        startX: e.clientX,
        startY: e.clientY,
        startConstraints: { ...comp.constraints },
      });
    },
    [selectComponent, setDragState]
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;

      const zoom = useEditorStore.getState().viewport.zoom;
      const dx = (e.clientX - dragState.startX) / zoom;
      const dy = (e.clientY - dragState.startY) / zoom;
      const sc = dragState.startConstraints;
      const comp = findComponent(useEditorStore.getState().document.components, dragState.componentId);
      const pins = comp?.pins ?? [];
      const newConstraints: Partial<Constraints> = {};

      const hPinned = pins.includes('left') || pins.includes('right');
      if (!hPinned) {
        newConstraints.left = Math.round((sc.left ?? 0) + dx);
      }

      const vPinned = pins.includes('top') || pins.includes('bottom');
      if (!vPinned) {
        newConstraints.top = Math.round((sc.top ?? 0) + dy);
      }

      if (Object.keys(newConstraints).length > 0) {
        updateConstraints(dragState.componentId, newConstraints);
      }
    },
    [dragState, updateConstraints]
  );

  return { handleComponentPointerDown, handleDragMove, dragState };
}
