import { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStoreApi } from '@/lib/store/editor-context';
import { MIN_ZOOM, MAX_ZOOM, PAN_CLAMP_MARGIN, FIT_PADDING, ZOOM_SENSITIVITY, labelWidthDots, labelHeightDots } from '@/lib/constants';
import type { LabelConfig } from '@/lib/types';

export function useCanvasZoomPan(
  canvasRef: React.RefObject<HTMLDivElement | null>,
  label: LabelConfig,
  activeVariant: string,
) {
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const hasInitialized = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const spaceRef = useRef(false);
  const storeApi = useEditorStoreApi();

  // Clean up window listeners if component unmounts mid-pan
  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);
  const widthDots = labelWidthDots(label, activeVariant);
  const heightDots = labelHeightDots(label, activeVariant);

  // Clamp pan via ref so wheel handler always uses latest values
  const clampPanRef = useRef((panX: number, panY: number, _zoom: number) => ({ panX, panY }));
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

  // Track spacebar for hand-tool panning
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        spaceRef.current = true;
        setIsSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceRef.current = false;
        setIsSpaceHeld(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const fitToView = useCallback(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const padding = FIT_PADDING;
    const scaleX = (rect.width - padding * 2) / widthDots;
    const scaleY = (rect.height - padding * 2) / heightDots;
    const fitZoom = Math.max(MIN_ZOOM, Math.min(scaleX, scaleY, MAX_ZOOM));
    storeApi.getState().setViewport(fitZoom, 0, 0);
  }, [storeApi, canvasRef, widthDots, heightDots]);

  // Fit label on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    const frame = requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      hasInitialized.current = true;
      fitToView();
    });
    return () => cancelAnimationFrame(frame);
  }, [canvasRef, fitToView]);

  // Non-passive wheel handler
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const store = storeApi.getState();
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
  }, [canvasRef, storeApi]);

  // Shared pan-drag logic for middle-mouse and space+drag
  const startPan = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsPanning(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const { panX: startPanX, panY: startPanY, zoom } = storeApi.getState().viewport;

      const onMove = (me: PointerEvent) => {
        const clamped = clampPanRef.current(
          startPanX + (me.clientX - startX),
          startPanY + (me.clientY - startY),
          zoom
        );
        storeApi.getState().setViewport(zoom, clamped.panX, clamped.panY);
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
    },
    [storeApi]
  );

  // Middle-mouse pan + left-click-on-background deselect
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1) {
        startPan(e);
        return;
      }

      // Left-click on background: deselect + marquee handled by Canvas
    },
    [startPan]
  );

  // Space+left-click pan — called from capture phase to intercept before
  // marquee/component handlers
  const handleSpacePanCapture = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 0 && spaceRef.current) {
        e.stopPropagation();
        startPan(e);
      }
    },
    [startPan]
  );

  return { handlePointerDown, handleSpacePanCapture, isPanning, isSpaceHeld, fitToView };
}
