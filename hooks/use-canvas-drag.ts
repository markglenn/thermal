import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { labelWidthDots, labelHeightDots } from '@/lib/constants';
import type { ComponentLayout } from '@/lib/types';

export function useCanvasDrag() {
  const dragState = useEditorStoreContext((s) => s.dragState);
  const storeApi = useEditorStoreApi();

  const startDrag = useCallback(
    (e: React.PointerEvent, componentId: string, selectedIds: string[]) => {
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
    },
    [storeApi]
  );

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
    [storeApi, startDrag]
  );

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

      const updates: { id: string; layout: Partial<ComponentLayout> }[] = [];

      updates.push({ id: ds.componentId, layout: computeMove(ds.startLayout, dx, dy, lw, lh) });

      if (ds.others) {
        for (const other of ds.others) {
          updates.push({ id: other.componentId, layout: computeMove(other.startLayout, dx, dy, lw, lh) });
        }
      }

      storeApi.getState().updateMultipleLayouts(updates);
    },
    [storeApi]
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
  // Center anchor behaves like left (positive dx = move right)
  const effectiveDx = startLayout.horizontalAnchor === 'right' ? -dx : dx;
  const effectiveDy = startLayout.verticalAnchor === 'bottom' ? -dy : dy;

  let newX = startLayout.lockX ? startLayout.x : Math.round(startLayout.x + effectiveDx);
  let newY = startLayout.lockY ? startLayout.y : Math.round(startLayout.y + effectiveDy);

  // Ensure the resolved top-left position never goes below 0,0.
  // Left-anchored: resolved x = layout.x → clamp layout.x >= 0
  // Right-anchored: resolved x = labelW - layout.x - width → clamp layout.x <= labelW - width
  // Center-anchored: resolved x = (labelW - width) / 2 + x → clamp x >= -(labelW - width) / 2
  // Center anchor: x is always 0 — perfectly centered, no horizontal drag
  if (startLayout.horizontalAnchor === 'center') {
    newX = 0;
  } else if (startLayout.horizontalAnchor === 'left') {
    newX = Math.max(0, newX);
  } else {
    newX = Math.min(newX, labelWidth - startLayout.width);
  }

  if (startLayout.verticalAnchor === 'top') {
    newY = Math.max(0, newY);
  } else {
    newY = Math.min(newY, labelHeight - startLayout.height);
  }

  return { x: newX, y: newY };
}
