import { useCallback } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';
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

      const state = useEditorStore.getState();
      const isToggle = e.shiftKey || e.metaKey || e.ctrlKey;
      const alreadySelected = state.selectedComponentIds.includes(componentId);

      // If toggle-clicking, just toggle selection — don't start drag
      if (isToggle) {
        selectComponent(componentId, { toggle: true });
        if (!alreadySelected) {
          // Will be selected after toggle — start drag with the new set
          const newIds = [...state.selectedComponentIds, componentId];
          startDrag(e, componentId, newIds);
        }
        return;
      }

      // If clicking an already-selected component in a multi-selection, keep the set
      if (!alreadySelected) {
        selectComponent(componentId);
      }

      const selectedIds = alreadySelected ? state.selectedComponentIds : [componentId];
      startDrag(e, componentId, selectedIds);
    },
    [selectComponent, setDragState]
  );

  function startDrag(e: React.PointerEvent, componentId: string, selectedIds: string[]) {
    const state = useEditorStore.getState();
    const comp = findComponent(state.document.components, componentId);
    if (!comp) return;

    // Collect start constraints for other selected components
    const others = selectedIds
      .filter((id) => id !== componentId)
      .map((id) => {
        const c = findComponent(state.document.components, id);
        return c ? { componentId: id, startConstraints: { ...c.constraints } } : null;
      })
      .filter((x): x is { componentId: string; startConstraints: Constraints } => x !== null);

    setDragState({
      componentId,
      startX: e.clientX,
      startY: e.clientY,
      startConstraints: { ...comp.constraints },
      others: others.length > 0 ? others : undefined,
    });
  }

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;

      const zoom = useEditorStore.getState().viewport.zoom;
      const dx = (e.clientX - dragState.startX) / zoom;
      const dy = (e.clientY - dragState.startY) / zoom;

      // Move the primary dragged component
      moveComponent(dragState.componentId, dragState.startConstraints, dx, dy);

      // Move other selected components by the same delta
      if (dragState.others) {
        for (const other of dragState.others) {
          moveComponent(other.componentId, other.startConstraints, dx, dy);
        }
      }
    },
    [dragState, updateConstraints]
  );

  function moveComponent(componentId: string, sc: Constraints, dx: number, dy: number) {
    const comp = findComponent(useEditorStore.getState().document.components, componentId);
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
      useEditorStore.getState().updateConstraints(componentId, newConstraints);
    }
  }

  return { handleComponentPointerDown, handleDragMove, dragState };
}
