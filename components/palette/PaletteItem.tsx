'use client';

import { useCallback } from 'react';
import type { ComponentType } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';

interface Props {
  type: ComponentType;
  label: string;
  icon: string;
}

const DRAG_THRESHOLD = 5;

export function PaletteItem({ type, label, icon }: Props) {
  const setPaletteDropState = useEditorStore((s) => s.setPaletteDropState);
  const addComponent = useEditorStore((s) => s.addComponent);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;

      const onMove = (me: PointerEvent) => {
        const dx = me.clientX - startX;
        const dy = me.clientY - startY;
        if (!dragging && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
          dragging = true;
        }
        if (dragging) {
          useEditorStore.getState().setPaletteDropState({
            type,
            ghostX: me.clientX,
            ghostY: me.clientY,
          });
        }
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (!dragging) {
          // Click — add at top-left
          addComponent(type);
        } else {
          // Drag — drop is handled by Canvas; clear if dropped outside
          setTimeout(() => {
            const state = useEditorStore.getState();
            if (state.paletteDropState) {
              state.setPaletteDropState(null);
            }
          }, 0);
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [type, setPaletteDropState, addComponent]
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-grab select-none"
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
