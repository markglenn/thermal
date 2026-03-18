import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { MIN_RESIZE_SIZE } from '@/lib/constants';
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

      // Handle names (left/right/top/bottom) are visual — "right" means the
      // right side of the component on screen, regardless of anchor direction.
      //
      // Resize rules:
      // - Dragging the right handle right → width increases (+dx)
      // - Dragging the left handle left → width increases (-dx)
      // - Dragging the bottom handle down → height increases (+dy)
      // - Dragging the top handle up → height increases (-dy)
      //
      // Position (x/y) adjustment:
      // - For left-anchored: dragging the LEFT handle changes x (anchor side moves)
      // - For right-anchored: dragging the RIGHT handle changes x (anchor side moves)
      // - Same for vertical axis with top/bottom

      const update: Partial<ComponentLayout> = {};

      if (isImage && comp) {
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
        newWidth = Math.round(newHeight * aspectRatio);

        update.width = newWidth;
        update.height = newHeight;

        // Adjust x when resizing from the anchor side
        const anchorIsLeft = sl.horizontalAnchor === 'left';
        if (handle.includes('left') && anchorIsLeft) {
          update.x = Math.round(sl.x + sl.width - newWidth);
        }
        if (handle.includes('right') && !anchorIsLeft) {
          update.x = Math.round(sl.x + sl.width - newWidth);
        }

        const anchorIsTop = sl.verticalAnchor === 'top';
        if (handle.startsWith('top') && anchorIsTop) {
          update.y = Math.round(sl.y + sl.height - newHeight);
        }
        if (handle.includes('bottom') && !anchorIsTop) {
          update.y = Math.round(sl.y + sl.height - newHeight);
        }
      } else {
        const anchorIsLeft = sl.horizontalAnchor === 'left';
        const anchorIsTop = sl.verticalAnchor === 'top';

        if (handle.includes('right')) {
          update.width = Math.round(Math.max(MIN_RESIZE_SIZE, sl.width + dx));
          // Right-anchored: right handle is the anchor side, adjust x
          if (!anchorIsLeft) {
            update.x = Math.round(sl.x + sl.width - update.width);
          }
        }
        if (handle.includes('left')) {
          const newWidth = Math.round(Math.max(MIN_RESIZE_SIZE, sl.width - dx));
          update.width = newWidth;
          // Left-anchored: left handle is the anchor side, adjust x
          if (anchorIsLeft) {
            update.x = Math.round(sl.x + sl.width - newWidth);
          }
        }

        if (handle.includes('bottom')) {
          update.height = Math.round(Math.max(MIN_RESIZE_SIZE, sl.height + dy));
          if (!anchorIsTop) {
            update.y = Math.round(sl.y + sl.height - update.height);
          }
        }
        if (handle.startsWith('top')) {
          const newHeight = Math.round(Math.max(MIN_RESIZE_SIZE, sl.height - dy));
          update.height = newHeight;
          if (anchorIsTop) {
            update.y = Math.round(sl.y + sl.height - newHeight);
          }
        }
      }

      state.updateLayout(resizeState.componentId, update);
    },
    [resizeState, storeApi]
  );

  return { handleResizeMove, resizeState };
}
