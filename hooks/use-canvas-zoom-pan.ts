import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';
import { MIN_ZOOM, MAX_ZOOM, PAN_CLAMP_MARGIN, FIT_PADDING, ZOOM_SENSITIVITY, labelWidthDots, labelHeightDots } from '@/lib/constants';
import type { LabelConfig } from '@/lib/types';

export function useCanvasZoomPan(
  canvasRef: React.RefObject<HTMLDivElement | null>,
  label: LabelConfig,
  labelRef?: React.RefObject<HTMLDivElement | null>
) {
  const [isPanning, setIsPanning] = useState(false);
  const hasInitialized = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Clean up window listeners if component unmounts mid-pan
  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);
  const widthDots = labelWidthDots(label);
  const heightDots = labelHeightDots(label);
  const selectComponent = useEditorStore((s) => s.selectComponent);

  // Clamp pan via ref so wheel handler always uses latest values
  const clampPanRef = useRef((panX: number, panY: number, zoom: number) => ({ panX, panY }));
  useEffect(() => {
    clampPanRef.current = (panX: number, panY: number, zoom: number) => {
      if (!canvasRef.current) return { panX, panY };
      const canvas = canvasRef.current.getBoundingClientRect();
      const margin = PAN_CLAMP_MARGIN;
      const labelW = widthDots * zoom;
      const labelH = heightDots * zoom;
      const maxPanX = canvas.width / 2 + labelW / 2 - margin;
      const maxPanY = canvas.height / 2 + labelH / 2 - margin;
      return {
        panX: Math.max(-maxPanX, Math.min(maxPanX, panX)),
        panY: Math.max(-maxPanY, Math.min(maxPanY, panY)),
      };
    };
  }, [canvasRef, widthDots, heightDots]);

  // Fit label on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    const frame = requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      hasInitialized.current = true;
      const padding = FIT_PADDING;
      const scaleX = (rect.width - padding * 2) / widthDots;
      const scaleY = (rect.height - padding * 2) / heightDots;
      const fitZoom = Math.max(MIN_ZOOM, Math.min(scaleX, scaleY, 1));
      useEditorStore.getState().setViewport(fitZoom, 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [canvasRef, widthDots, heightDots]);

  // Non-passive wheel handler
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const store = useEditorStore.getState();
      const { zoom, panX, panY } = store.viewport;
      if (e.ctrlKey || e.metaKey) {
        const factor = 1 - e.deltaY * ZOOM_SENSITIVITY;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
        const clamped = clampPanRef.current(panX, panY, newZoom);
        store.setViewport(newZoom, clamped.panX, clamped.panY);
      } else {
        const clamped = clampPanRef.current(panX - e.deltaX, panY - e.deltaY, zoom);
        store.setViewport(zoom, clamped.panX, clamped.panY);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [canvasRef]);

  // Middle-mouse pan + left-click deselect
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        const startX = e.clientX;
        const startY = e.clientY;
        const { panX: startPanX, panY: startPanY, zoom } = useEditorStore.getState().viewport;

        const onMove = (me: PointerEvent) => {
          const clamped = clampPanRef.current(
            startPanX + (me.clientX - startX),
            startPanY + (me.clientY - startY),
            zoom
          );
          useEditorStore.getState().setViewport(zoom, clamped.panX, clamped.panY);
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          cleanupRef.current = null;
          setIsPanning(false);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        cleanupRef.current = onUp;
        return;
      }

      if (e.button === 0) {
        // If click is inside the label surface, let the marquee handler deal with it
        if (labelRef?.current?.contains(e.target as Node)) return;

        selectComponent(null);

        // Left-click drag to pan (only from gray background)
        const startX = e.clientX;
        const startY = e.clientY;
        const { panX: startPanX, panY: startPanY, zoom } = useEditorStore.getState().viewport;

        const onMove = (me: PointerEvent) => {
          setIsPanning(true);
          const clamped = clampPanRef.current(
            startPanX + (me.clientX - startX),
            startPanY + (me.clientY - startY),
            zoom
          );
          useEditorStore.getState().setViewport(zoom, clamped.panX, clamped.panY);
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          cleanupRef.current = null;
          setIsPanning(false);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        cleanupRef.current = onUp;
      }
    },
    [selectComponent]
  );

  return { handlePointerDown, isPanning };
}
