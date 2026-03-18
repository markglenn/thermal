import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { MIN_RESIZE_SIZE, clampCoord } from '@/lib/constants';
import type { ComponentLayout, ImageProperties } from '@/lib/types';

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

      const comp = findComponent(state.document.components, resizeState.componentId);
      const isImage = comp?.typeData.type === 'image';

      const update: Partial<ComponentLayout> = {};

      if (isImage && comp) {
        // Image: proportional resize driven by width
        const props = comp.typeData.props as ImageProperties;
        const aspectRatio = props.originalWidth / props.originalHeight;
        const maxW = props.originalWidth;
        const maxH = props.originalHeight;

        let newWidth: number;
        if (handle.includes('right')) {
          newWidth = sl.width + dx;
        } else if (handle.includes('left')) {
          newWidth = sl.width - dx;
        } else {
          newWidth = sl.width;
        }

        newWidth = Math.round(Math.max(MIN_RESIZE_SIZE, Math.min(newWidth, maxW)));
        let newHeight = Math.round(Math.max(MIN_RESIZE_SIZE, Math.min(newWidth / aspectRatio, maxH)));
        // Re-derive width in case height hit the max
        newWidth = Math.round(newHeight * aspectRatio);

        update.width = newWidth;
        update.height = newHeight;

        // Adjust position for left/top corner drags
        if (handle.includes('left')) {
          update.x = Math.round(sl.x + sl.width - newWidth);
        }
        if (handle.startsWith('top')) {
          update.y = Math.round(sl.y + sl.height - newHeight);
        }
      } else {
        // Generic resize
        if (handle.includes('right')) {
          update.width = Math.round(Math.max(MIN_RESIZE_SIZE, sl.width + dx));
        }
        if (handle.includes('left')) {
          const newWidth = Math.round(Math.max(MIN_RESIZE_SIZE, sl.width - dx));
          const widthDelta = newWidth - sl.width;
          update.width = newWidth;
          update.x = clampCoord(sl.x - widthDelta);
        }

        if (handle.includes('bottom')) {
          update.height = Math.round(Math.max(MIN_RESIZE_SIZE, sl.height + dy));
        }
        if (handle.startsWith('top')) {
          const newHeight = Math.round(Math.max(MIN_RESIZE_SIZE, sl.height - dy));
          const heightDelta = newHeight - sl.height;
          update.height = newHeight;
          update.y = clampCoord(sl.y - heightDelta);
        }
      }

      state.updateLayout(resizeState.componentId, update);
    },
    [resizeState, storeApi]
  );

  return { handleResizeMove, resizeState };
}
