import { useCallback } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';
import { findComponent } from '@/lib/utils';
import type { Constraints, PinnableEdge } from '@/lib/types';

export function useCanvasDrag() {
  const dragState = useEditorStore((s) => s.dragState);

  const handleComponentPointerDown = useCallback(
    (e: React.PointerEvent, componentId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const store = useEditorStore.getState();
      const isToggle = e.shiftKey || e.metaKey || e.ctrlKey;
      const alreadySelected = store.selectedComponentIds.includes(componentId);

      if (isToggle) {
        store.selectComponent(componentId, { toggle: true });
        if (!alreadySelected) {
          const newIds = [...store.selectedComponentIds, componentId];
          startDrag(e, componentId, newIds);
        }
        return;
      }

      if (!alreadySelected) {
        store.selectComponent(componentId);
      }

      const selectedIds = alreadySelected ? store.selectedComponentIds : [componentId];
      startDrag(e, componentId, selectedIds);
    },
    []
  );

  function startDrag(e: React.PointerEvent, componentId: string, selectedIds: string[]) {
    const state = useEditorStore.getState();
    const comp = findComponent(state.document.components, componentId);
    if (!comp) return;

    const others = selectedIds
      .filter((id) => id !== componentId)
      .map((id) => {
        const c = findComponent(state.document.components, id);
        return c ? { componentId: id, startConstraints: { ...c.constraints }, pins: [...c.pins] } : null;
      })
      .filter((x): x is { componentId: string; startConstraints: Constraints; pins: PinnableEdge[] } => x !== null);

    state.setDragState({
      componentId,
      startX: e.clientX,
      startY: e.clientY,
      startConstraints: { ...comp.constraints },
      pins: [...comp.pins],
      others: others.length > 0 ? others : undefined,
    });
  }

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      const ds = useEditorStore.getState().dragState;
      if (!ds) return;

      const zoom = useEditorStore.getState().viewport.zoom;
      const dx = (e.clientX - ds.startX) / zoom;
      const dy = (e.clientY - ds.startY) / zoom;

      // Collect all constraint updates and apply in a single store mutation
      const updates: { id: string; constraints: Partial<Constraints> }[] = [];

      const primary = computeMove(ds.startConstraints, ds.pins, dx, dy);
      if (primary) updates.push({ id: ds.componentId, constraints: primary });

      if (ds.others) {
        for (const other of ds.others) {
          const moved = computeMove(other.startConstraints, other.pins, dx, dy);
          if (moved) updates.push({ id: other.componentId, constraints: moved });
        }
      }

      if (updates.length > 0) {
        useEditorStore.getState().updateMultipleConstraints(updates);
      }
    },
    []
  );

  return { handleComponentPointerDown, handleDragMove, dragState };
}

function computeMove(
  sc: Constraints,
  pins: PinnableEdge[],
  dx: number,
  dy: number,
): Partial<Constraints> | null {
  const newConstraints: Partial<Constraints> = {};

  const hPinned = pins.includes('left') || pins.includes('right');
  if (!hPinned) {
    newConstraints.left = Math.round((sc.left ?? 0) + dx);
  }

  const vPinned = pins.includes('top') || pins.includes('bottom');
  if (!vPinned) {
    newConstraints.top = Math.round((sc.top ?? 0) + dy);
  }

  return Object.keys(newConstraints).length > 0 ? newConstraints : null;
}
