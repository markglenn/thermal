import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { MIN_RESIZE_SIZE, clampCoord } from '@/lib/constants';
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

      const update: Partial<ComponentLayout> = {};

      // Horizontal resizing
      if (handle.includes('right')) {
        update.width = Math.round(Math.max(MIN_RESIZE_SIZE, sl.width + dx));
      }
      if (handle.includes('left')) {
        const newWidth = Math.round(Math.max(MIN_RESIZE_SIZE, sl.width - dx));
        const widthDelta = newWidth - sl.width;
        update.width = newWidth;
        update.x = clampCoord(sl.x - widthDelta);
      }

      // Vertical resizing
      if (handle.includes('bottom')) {
        update.height = Math.round(Math.max(MIN_RESIZE_SIZE, sl.height + dy));
      }
      if (handle.startsWith('top')) {
        const newHeight = Math.round(Math.max(MIN_RESIZE_SIZE, sl.height - dy));
        const heightDelta = newHeight - sl.height;
        update.height = newHeight;
        update.y = clampCoord(sl.y - heightDelta);
      }

      state.updateLayout(resizeState.componentId, update);
    },
    [resizeState]
  );

  return { handleResizeMove, resizeState };
}
