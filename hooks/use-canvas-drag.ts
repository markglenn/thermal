import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { labelWidthDots, labelHeightDots } from '@/lib/constants';
import { resolveLayout } from '@/lib/constraints/resolver';
import { buildSnapAxis, computeSnap } from '@/lib/snap';
import type { SnapAxis } from '@/lib/snap';
import { setSnapGuides } from '@/lib/snap-guides-store';
import type { ComponentLayout, ResolvedBounds } from '@/lib/types';

interface SnapCache {
  xAxis: SnapAxis;
  yAxis: SnapAxis;
  lw: number;
  lh: number;
}

let snapCache: SnapCache | null = null;

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

      // Pre-compute snap targets at drag start
      const lw = labelWidthDots(state.document.label);
      const lh = labelHeightDots(state.document.label);
      const draggedIds = new Set(selectedIds);
      const boundsMap = new Map<string, ResolvedBounds>();
      for (const c of state.document.components) {
        boundsMap.set(c.id, resolveLayout(c.layout, lw, lh));
      }

      snapCache = {
        xAxis: buildSnapAxis(boundsMap, draggedIds, lw, 'x'),
        yAxis: buildSnapAxis(boundsMap, draggedIds, lh, 'y'),
        lw,
        lh,
      };

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
        if (!alreadySelected && !store.readOnly) {
          const newIds = [...store.selectedComponentIds, componentId];
          startDrag(e, componentId, newIds);
        }
        return;
      }

      if (!alreadySelected) {
        store.selectComponent(componentId);
      }

      if (store.readOnly) return;

      const selectedIds = alreadySelected ? store.selectedComponentIds : [componentId];
      startDrag(e, componentId, selectedIds);
    },
    [storeApi, startDrag]
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      const state = storeApi.getState();
      const ds = state.dragState;
      if (!ds) return;

      const zoom = state.viewport.zoom;
      let dx = (e.clientX - ds.startX) / zoom;
      let dy = (e.clientY - ds.startY) / zoom;

      // Compute snap unless Alt/Option is held
      if (!e.altKey && snapCache) {
        const { lw, lh } = snapCache;

        // Resolve where the primary component would be with the raw delta
        const rawLayout = ds.startLayout;
        const rawBounds = resolveLayout(
          {
            ...rawLayout,
            x: rawLayout.x + (rawLayout.horizontalAnchor === 'right' ? -dx : dx),
            y: rawLayout.y + (rawLayout.verticalAnchor === 'bottom' ? -dy : dy),
          },
          lw, lh,
        );

        // For multi-select, expand to the bounding box of all dragged components
        let dragBounds = rawBounds;
        if (ds.others && ds.others.length > 0) {
          let minX = rawBounds.x, minY = rawBounds.y;
          let maxX = rawBounds.x + rawBounds.width, maxY = rawBounds.y + rawBounds.height;
          for (const other of ds.others) {
            const ol = other.startLayout;
            const ob = resolveLayout(
              {
                ...ol,
                x: ol.x + (ol.horizontalAnchor === 'right' ? -dx : dx),
                y: ol.y + (ol.verticalAnchor === 'bottom' ? -dy : dy),
              },
              lw, lh,
            );
            minX = Math.min(minX, ob.x);
            minY = Math.min(minY, ob.y);
            maxX = Math.max(maxX, ob.x + ob.width);
            maxY = Math.max(maxY, ob.y + ob.height);
          }
          dragBounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }

        const snap = computeSnap(dragBounds, snapCache.xAxis, snapCache.yAxis);
        dx += snap.dx;
        dy += snap.dy;
        setSnapGuides(snap.guides);
      } else {
        setSnapGuides([]);
      }

      const lw = snapCache?.lw ?? labelWidthDots(state.document.label);
      const lh = snapCache?.lh ?? labelHeightDots(state.document.label);

      const updates: { id: string; layout: Partial<ComponentLayout> }[] = [];
      updates.push({ id: ds.componentId, layout: computeMove(ds.startLayout, dx, dy, lw, lh) });

      if (ds.others) {
        for (const other of ds.others) {
          updates.push({ id: other.componentId, layout: computeMove(other.startLayout, dx, dy, lw, lh) });
        }
      }

      state.updateMultipleLayouts(updates);
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
  const effectiveDx = startLayout.horizontalAnchor === 'right' ? -dx : dx;
  const effectiveDy = startLayout.verticalAnchor === 'bottom' ? -dy : dy;

  let newX = startLayout.lockX ? startLayout.x : Math.round(startLayout.x + effectiveDx);
  let newY = startLayout.lockY ? startLayout.y : Math.round(startLayout.y + effectiveDy);

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
