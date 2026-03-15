import { useCallback } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';

export function usePaletteDrop(labelRef: React.RefObject<HTMLDivElement | null>) {
  const addComponent = useEditorStore((s) => s.addComponent);
  const setPaletteDropState = useEditorStore((s) => s.setPaletteDropState);

  const screenToDots = useCallback(
    (clientX: number, clientY: number): { left: number; top: number } | null => {
      if (!labelRef.current) return null;
      const labelRect = labelRef.current.getBoundingClientRect();
      const { zoom } = useEditorStore.getState().viewport;
      const left = Math.round((clientX - labelRect.left) / zoom);
      const top = Math.round((clientY - labelRect.top) / zoom);
      return { left, top };
    },
    [labelRef]
  );

  const handleDrop = useCallback(
    (e: React.PointerEvent) => {
      const dropState = useEditorStore.getState().paletteDropState;
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
