import { useState, useCallback, useRef } from 'react';
import { useEditorStoreApi } from '@/lib/store/editor-context';
import type { ResolvedBounds } from '@/lib/types';

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useMarqueeSelect(
  labelRef: React.RefObject<HTMLDivElement | null>,
  absoluteBoundsMap: Map<string, ResolvedBounds>
) {
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const storeApi = useEditorStoreApi();

  const startMarquee = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;

      e.preventDefault();

      const zoom = storeApi.getState().viewport.zoom;
      const rect = labelRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      startRef.current = { x, y };

      // Clear selection unless shift is held
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        storeApi.getState().selectComponent(null);
      }

      const onMove = (me: PointerEvent) => {
        if (!startRef.current || !rect) return;
        const curX = (me.clientX - rect.left) / zoom;
        const curY = (me.clientY - rect.top) / zoom;
        const sx = startRef.current.x;
        const sy = startRef.current.y;

        const marqueeRect: MarqueeRect = {
          x: Math.min(sx, curX),
          y: Math.min(sy, curY),
          width: Math.abs(curX - sx),
          height: Math.abs(curY - sy),
        };
        setMarquee(marqueeRect);

        // Select components that intersect the marquee
        const ids: string[] = [];
        for (const [id, bounds] of absoluteBoundsMap) {
          if (rectsIntersect(marqueeRect, bounds)) {
            ids.push(id);
          }
        }
        storeApi.getState().selectComponent(null);
        for (const id of ids) {
          storeApi.getState().selectComponent(id, { toggle: true });
        }
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        startRef.current = null;
        setMarquee(null);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [storeApi, labelRef, absoluteBoundsMap]
  );

  const handleLabelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only start marquee on direct clicks on the label surface (not on components)
      if (e.target !== e.currentTarget) return;
      startMarquee(e);
    },
    [startMarquee]
  );

  return { marquee, handleLabelPointerDown, startMarquee };
}

function rectsIntersect(a: MarqueeRect, b: ResolvedBounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
