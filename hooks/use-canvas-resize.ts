import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { MIN_RESIZE_SIZE, clampCoord } from '@/lib/constants';
import type { ImageProperties } from '@/lib/types';

export function useCanvasResize() {
  const resizeState = useEditorStoreContext((s) => s.resizeState);
  const updateConstraints = useEditorStoreContext((s) => s.updateConstraints);
  const storeApi = useEditorStoreApi();

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeState) return;

      const state = storeApi.getState();
      const zoom = state.viewport.zoom;
      const dx = (e.clientX - resizeState.startX) / zoom;
      const dy = (e.clientY - resizeState.startY) / zoom;
      const sc = resizeState.startConstraints;
      const newConstraints = { ...sc };
      const handle = resizeState.handle;

      const comp = findComponent(state.document.components, resizeState.componentId);
      const isImage = comp?.typeData.type === 'image';

      if (isImage && comp) {
        const props = comp.typeData.props as ImageProperties;
        const aspectRatio = (sc.width ?? props.originalWidth) / (sc.height ?? props.originalHeight);
        const maxW = props.originalWidth;
        const maxH = props.originalHeight;

        // Determine dominant axis delta from corner handle
        let newWidth: number;
        let newHeight: number;

        if (handle.includes('right')) {
          newWidth = (sc.width ?? props.originalWidth) + dx;
        } else if (handle.includes('left')) {
          newWidth = (sc.width ?? props.originalWidth) - dx;
        } else {
          newWidth = sc.width ?? props.originalWidth;
        }

        // Use width as the driving dimension, derive height from aspect ratio
        newWidth = Math.round(Math.max(MIN_RESIZE_SIZE, Math.min(newWidth, maxW)));
        newHeight = Math.round(Math.max(MIN_RESIZE_SIZE, Math.min(newWidth / aspectRatio, maxH)));
        // Re-derive width in case height hit the max
        newWidth = Math.round(newHeight * aspectRatio);

        newConstraints.width = newWidth;
        newConstraints.height = newHeight;

        // Adjust position for top-left / bottom-left corner drags
        if (handle.includes('left') && sc.left !== undefined) {
          newConstraints.left = Math.round(sc.left + (sc.width ?? props.originalWidth) - newWidth);
        }
        if (handle.startsWith('top') && sc.top !== undefined) {
          newConstraints.top = Math.round(sc.top + (sc.height ?? props.originalHeight) - newHeight);
        }
      } else {
        if (handle.includes('left')) {
          if (sc.left !== undefined) newConstraints.left = clampCoord(sc.left + dx);
          if (sc.width !== undefined && sc.right === undefined) newConstraints.width = Math.round(Math.max(MIN_RESIZE_SIZE, sc.width - dx));
        }
        if (handle.includes('right') || handle === 'right') {
          if (sc.right !== undefined) newConstraints.right = clampCoord(sc.right - dx);
          if (sc.width !== undefined && sc.left !== undefined && sc.right === undefined) newConstraints.width = Math.round(Math.max(MIN_RESIZE_SIZE, sc.width + dx));
        }

        if (handle.startsWith('top')) {
          if (sc.top !== undefined) newConstraints.top = clampCoord(sc.top + dy);
          if (sc.height !== undefined && sc.bottom === undefined) newConstraints.height = Math.round(Math.max(MIN_RESIZE_SIZE, sc.height - dy));
        }
        if (handle.includes('bottom')) {
          if (sc.bottom !== undefined) newConstraints.bottom = clampCoord(sc.bottom - dy);
          if (sc.height !== undefined && sc.top !== undefined && sc.bottom === undefined) newConstraints.height = Math.round(Math.max(MIN_RESIZE_SIZE, sc.height + dy));
        }
      }

      updateConstraints(resizeState.componentId, newConstraints);
    },
    [resizeState, updateConstraints]
  );

  return { handleResizeMove, resizeState };
}
