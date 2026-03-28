import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { MIN_RESIZE_SIZE, labelWidthDots, labelHeightDots } from '@/lib/constants';
import type { ComponentLayout } from '@/lib/types';

export function useCanvasResize() {
  const resizeState = useEditorStoreContext((s) => s.resizeState);
  const storeApi = useEditorStoreApi();

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeState) return;

      const state = storeApi.getState();
      const zoom = state.viewport.zoom;
      const dx = (e.clientX - resizeState.startX) / zoom;
      const dy = (e.clientY - resizeState.startY) / zoom;
      const sl = resizeState.startLayout;
      const handle = resizeState.handle;
      const labelW = labelWidthDots(state.document.label, state.activeVariant);
      const labelH = labelHeightDots(state.document.label, state.activeVariant);

      const update: Partial<ComponentLayout> = {};
      const isCenter = sl.horizontalAnchor === 'center';
      const anchorIsLeft = sl.horizontalAnchor === 'left';
      const anchorIsTop = sl.verticalAnchor === 'top';

      // Clamping: the visual top-left must never go past 0,0.
      // Only left/top handles can move the visual top-left edge.
      // Right/bottom handles never affect it — they grow away from the origin.
      // Center anchor: both handles just change width — the centering formula
      // repositions symmetrically, so x doesn't need adjusting.

      if (handle.includes('right')) {
        let newWidth = Math.round(Math.max(MIN_RESIZE_SIZE, sl.width + dx));
        // Center-anchored: growing right also pushes visual left — clamp so it stays >= 0
        // visual left = (labelW - width) / 2 + x → max width = labelW + 2*sl.x
        if (isCenter) {
          newWidth = Math.min(newWidth, labelW + 2 * sl.x);
        }
        update.width = newWidth;
        // Right-anchored: right handle is anchor side, adjust x (no clamp needed)
        if (!anchorIsLeft && !isCenter) {
          update.x = Math.round(sl.x + sl.width - update.width);
        }
      }

      if (handle.includes('left')) {
        let newWidth = Math.round(Math.max(MIN_RESIZE_SIZE, sl.width - dx));
        // Left handle moves visual left edge — clamp so it doesn't go past 0
        // Left-anchored: visual left = newX → max width = sl.x + sl.width
        // Center-anchored: visual left = (labelW - newW) / 2 + x → max = labelW + 2*sl.x
        // Right-anchored: visual left = labelW - sl.x - newWidth → max = labelW - sl.x
        let maxW: number;
        if (isCenter) {
          maxW = labelW + 2 * sl.x;
        } else if (anchorIsLeft) {
          maxW = sl.x + sl.width;
        } else {
          maxW = labelW - sl.x;
        }
        newWidth = Math.min(newWidth, maxW);
        if (anchorIsLeft) {
          update.x = Math.round(sl.x + sl.width - newWidth);
        }
        // Center: don't adjust x — centering formula handles repositioning
        update.width = newWidth;
      }

      if (handle.includes('bottom')) {
        update.height = Math.round(Math.max(MIN_RESIZE_SIZE, sl.height + dy));
        // Bottom-anchored: bottom handle is anchor side, adjust y (no clamp needed)
        if (!anchorIsTop) {
          update.y = Math.round(sl.y + sl.height - update.height);
        }
      }

      if (handle.startsWith('top')) {
        let newHeight = Math.round(Math.max(MIN_RESIZE_SIZE, sl.height - dy));
        // Top handle moves visual top edge — clamp so it doesn't go past 0
        // Top-anchored: visual top = y = sl.y + sl.height - newHeight → max = sl.y + sl.height
        // Bottom-anchored: visual top = labelH - sl.y - newHeight → max = labelH - sl.y
        const maxH = anchorIsTop ? sl.y + sl.height : labelH - sl.y;
        newHeight = Math.min(newHeight, maxH);
        if (anchorIsTop) {
          update.y = Math.round(sl.y + sl.height - newHeight);
        }
        update.height = newHeight;
      }

      state.updateLayout(resizeState.componentId, update);
    },
    [resizeState, storeApi]
  );

  return { handleResizeMove, resizeState };
}
