import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';

export function usePaletteDrop(labelRef: React.RefObject<HTMLDivElement | null>) {
  const addComponent = useEditorStoreContext((s) => s.addComponent);
  const setPaletteDropState = useEditorStoreContext((s) => s.setPaletteDropState);
  const storeApi = useEditorStoreApi();

  const screenToDots = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      if (!labelRef.current) return null;
      const labelRect = labelRef.current.getBoundingClientRect();
      const { zoom } = storeApi.getState().viewport;
      const x = Math.round((clientX - labelRect.left) / zoom);
      const y = Math.round((clientY - labelRect.top) / zoom);
      return { x, y };
    },
    [storeApi, labelRef]
  );

  const handleDrop = useCallback(
    (e: React.PointerEvent) => {
      const dropState = storeApi.getState().paletteDropState;
      if (!dropState) return;

      const dots = screenToDots(e.clientX, e.clientY);
      if (dots && dots.x >= 0 && dots.y >= 0) {
        addComponent(dropState.type, { x: dots.x, y: dots.y });
      }
      setPaletteDropState(null);
    },
    [storeApi, screenToDots, addComponent, setPaletteDropState]
  );

  return { handleDrop };
}
