import { useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';

export function usePaletteDrop(labelRef: React.RefObject<HTMLDivElement | null>) {
  const addComponent = useEditorStoreContext((s) => s.addComponent);
  const setPaletteDropState = useEditorStoreContext((s) => s.setPaletteDropState);
  const storeApi = useEditorStoreApi();

  const screenToDots = useCallback(
    (clientX: number, clientY: number): { left: number; top: number } | null => {
      if (!labelRef.current) return null;
      const labelRect = labelRef.current.getBoundingClientRect();
      const { zoom } = storeApi.getState().viewport;
      const left = Math.round((clientX - labelRect.left) / zoom);
      const top = Math.round((clientY - labelRect.top) / zoom);
      return { left, top };
    },
    [labelRef]
  );

  const handleDrop = useCallback(
    (e: React.PointerEvent) => {
      const dropState = storeApi.getState().paletteDropState;
      if (!dropState) return;

      const dots = screenToDots(e.clientX, e.clientY);
      if (dots && dots.left >= 0 && dots.top >= 0) {
        addComponent(dropState.type, { left: dots.left, top: dots.top });
      }
      setPaletteDropState(null);
    },
    [screenToDots, addComponent, setPaletteDropState]
  );

  return { handleDrop };
}
