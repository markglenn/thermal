import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { labelWidthDots, labelHeightDots } from '@/lib/constants';
import type { ComponentLayout } from '@/lib/types';

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
        return c ? { componentId: id, startLayout: { ...c.layout } } : null;
      })
      .filter((x): x is { componentId: string; startLayout: ComponentLayout } => x !== null);

    state.setDragState({
      componentId,
      startX: e.clientX,
      startY: e.clientY,
      startLayout: { ...comp.layout },
      others: others.length > 0 ? others : undefined,
    });
  }

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      const ds = storeApi.getState().dragState;
      if (!ds) return;

      const state = storeApi.getState();
      const zoom = state.viewport.zoom;
      const dx = (e.clientX - ds.startX) / zoom;
      const dy = (e.clientY - ds.startY) / zoom;
      const lw = labelWidthDots(state.document.label);
      const lh = labelHeightDots(state.document.label);

      // Collect all layout updates and apply in a single store mutation
      const updates: { id: string; layout: Partial<ComponentLayout> }[] = [];

      const primary = computeMove(ds.startLayout, dx, dy, lw, lh);
      updates.push({ id: ds.componentId, layout: primary });

      if (ds.others) {
        for (const other of ds.others) {
          const moved = computeMove(other.startLayout, dx, dy, lw, lh);
          updates.push({ id: other.componentId, layout: moved });
        }
      }

      storeApi.getState().updateMultipleLayouts(updates);
    },
    []
  );

  return { handleComponentPointerDown, handleDragMove, dragState };
}

function computeMove(
  startLayout: ComponentLayout,
  dx: number,
  dy: number,
  labelWidth: number,
  labelHeight: number,
): Partial<ComponentLayout> {
  // Invert delta for right/bottom anchors — dragging right should move
  // the component right (closer to the right edge = smaller x value)
  const effectiveDx = startLayout.horizontalAnchor === 'right' ? -dx : dx;
  const effectiveDy = startLayout.verticalAnchor === 'bottom' ? -dy : dy;

  // Lower bound: can't go past the anchored edge (x >= 0)
  // Upper bound: for right/bottom anchored, can't go past the opposite edge
  //   (resolved position must be >= 0, i.e. x <= labelSize - componentSize)
  // For left/top anchored: no upper bound (can overflow right/bottom)
  const maxX = startLayout.horizontalAnchor === 'right'
    ? Math.max(0, labelWidth - startLayout.width)
    : Infinity;
  const maxY = startLayout.verticalAnchor === 'bottom'
    ? Math.max(0, labelHeight - startLayout.height)
    : Infinity;

  return {
    x: Math.max(0, Math.min(maxX, Math.round(startLayout.x + effectiveDx))),
    y: Math.max(0, Math.min(maxY, Math.round(startLayout.y + effectiveDy))),
  };
}
