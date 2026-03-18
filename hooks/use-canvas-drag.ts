import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { clampCoord } from '@/lib/constants';
import type { Constraints, PinnableEdge } from '@/lib/types';

export function useCanvasDrag() {
  const dragState = useEditorStoreContext((s) => s.dragState);
  const storeApi = useEditorStoreApi();

  const handleComponentPointerDown = useCallback(
    (e: React.PointerEvent, componentId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const store = storeApi.getState();
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
    const state = storeApi.getState();
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
      const ds = storeApi.getState().dragState;
      if (!ds) return;

      const zoom = storeApi.getState().viewport.zoom;
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
        storeApi.getState().updateMultipleConstraints(updates);
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
    newConstraints.left = clampCoord((sc.left ?? 0) + dx);
  }

  const vPinned = pins.includes('top') || pins.includes('bottom');
  if (!vPinned) {
    newConstraints.top = clampCoord((sc.top ?? 0) + dy);
  }

  return Object.keys(newConstraints).length > 0 ? newConstraints : null;
}
