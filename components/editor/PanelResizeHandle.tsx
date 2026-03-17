'use client';

import { useRef, useCallback } from 'react';

interface Props {
  direction: 'horizontal' | 'vertical';
  size: number;
  onSizeChange: (newSize: number) => void;
  min: number;
  max: number;
  /** For right/bottom panels, drag direction is inverted */
  invert?: boolean;
  /** Called on double-click (e.g. to collapse) */
  onDoubleClick?: () => void;
}

export function PanelResizeHandle({ direction, size, onSizeChange, min, max, invert, onDoubleClick }: Props) {
  const startSizeRef = useRef(size);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      startSizeRef.current = size;
      const startPos = direction === 'horizontal' ? e.clientX : e.clientY;

      const onMove = (me: PointerEvent) => {
        const currentPos = direction === 'horizontal' ? me.clientX : me.clientY;
        const delta = (currentPos - startPos) * (invert ? -1 : 1);
        onSizeChange(Math.max(min, Math.min(max, startSizeRef.current + delta)));
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [direction, size, onSizeChange, min, max, invert]
  );

  if (direction === 'vertical') {
    return (
      <div
        className="h-1 cursor-row-resize hover:bg-blue-300 active:bg-blue-400 transition-colors shrink-0"
        onPointerDown={handlePointerDown}
        onDoubleClick={onDoubleClick}
      />
    );
  }

  return (
    <div
      className="w-1 cursor-col-resize hover:bg-blue-300 active:bg-blue-400 transition-colors shrink-0"
      onPointerDown={handlePointerDown}
      onDoubleClick={onDoubleClick}
    />
  );
}
