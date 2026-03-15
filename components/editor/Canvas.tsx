'use client';

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';
import { useDocument, useViewport } from '@/hooks/use-editor-store';
import { resolveDocument } from '@/lib/constraints/resolver';
import { labelWidthDots, labelHeightDots, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '@/lib/constants';
import { CanvasComponent } from './CanvasComponent';
import { ContainerComponent } from './ContainerComponent';
import { SelectionOverlay } from './SelectionOverlay';
import type { LabelComponent, ResolvedBounds } from '@/lib/types';

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const document = useDocument();
  const viewport = useViewport();
  const selectedId = useEditorStore((s) => s.selectedComponentId);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const setViewport = useEditorStore((s) => s.setViewport);
  const updateConstraints = useEditorStore((s) => s.updateConstraints);
  const dragState = useEditorStore((s) => s.dragState);
  const setDragState = useEditorStore((s) => s.setDragState);
  const resizeState = useEditorStore((s) => s.resizeState);
  const setResizeState = useEditorStore((s) => s.setResizeState);
  const showGrid = useEditorStore((s) => s.showGrid);
  const gridSize = useEditorStore((s) => s.gridSize);

  const widthDots = labelWidthDots(document.label);
  const heightDots = labelHeightDots(document.label);

  // Track actual measured sizes for text components (DOM-measured, not estimated)
  const [measuredSizes, setMeasuredSizes] = useState<Map<string, { width: number; height: number }>>(new Map());
  const handleMeasure = useCallback((id: string, width: number, height: number) => {
    setMeasuredSizes((prev) => {
      const existing = prev.get(id);
      if (existing && existing.width === width && existing.height === height) return prev;
      const next = new Map(prev);
      next.set(id, { width, height });
      return next;
    });
  }, []);

  // Fit label in viewport on mount (deferred to ensure layout is computed)
  useEffect(() => {
    if (hasInitialized.current) return;
    const frame = requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      hasInitialized.current = true;
      const padding = 40;
      const scaleX = (rect.width - padding * 2) / widthDots;
      const scaleY = (rect.height - padding * 2) / heightDots;
      const fitZoom = Math.max(MIN_ZOOM, Math.min(scaleX, scaleY, 1));
      setViewport(fitZoom, 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [widthDots, heightDots, setViewport]);

  const boundsMap = useMemo(
    () => resolveDocument(document),
    [document]
  );

  // Attach wheel handler as non-passive so preventDefault() actually blocks
  // the browser's native pinch-to-zoom on the page
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const { zoom, panX, panY } = useEditorStore.getState().viewport;
        const factor = 1 - e.deltaY * 0.005;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
        useEditorStore.getState().setViewport(newZoom, panX, panY);
      } else {
        const { zoom, panX, panY } = useEditorStore.getState().viewport;
        useEditorStore.getState().setViewport(zoom, panX - e.deltaX, panY - e.deltaY);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Middle mouse for panning
      if (e.button === 1) {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startPanX = viewport.panX;
        const startPanY = viewport.panY;

        const onMove = (me: PointerEvent) => {
          setViewport(
            viewport.zoom,
            startPanX + (me.clientX - startX),
            startPanY + (me.clientY - startY)
          );
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return;
      }

      // Left click on blank canvas deselects
      if (e.button === 0) {
        selectComponent(null);
      }
    },
    [viewport, setViewport, selectComponent]
  );

  const handleComponentPointerDown = useCallback(
    (e: React.PointerEvent, componentId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      selectComponent(componentId);

      const comp = findComponentInTree(document.components, componentId);
      if (!comp) return;

      setDragState({
        componentId,
        startX: e.clientX,
        startY: e.clientY,
        startConstraints: { ...comp.constraints },
      });
    },
    [document.components, selectComponent, setDragState]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragState) {
        const dx = (e.clientX - dragState.startX) / viewport.zoom;
        const dy = (e.clientY - dragState.startY) / viewport.zoom;
        const newConstraints = { ...dragState.startConstraints };
        if (newConstraints.left !== undefined) newConstraints.left = Math.round(dragState.startConstraints.left! + dx);
        if (newConstraints.top !== undefined) newConstraints.top = Math.round(dragState.startConstraints.top! + dy);
        if (newConstraints.right !== undefined) newConstraints.right = Math.round(dragState.startConstraints.right! - dx);
        if (newConstraints.bottom !== undefined) newConstraints.bottom = Math.round(dragState.startConstraints.bottom! - dy);
        updateConstraints(dragState.componentId, newConstraints);
      }

      if (resizeState) {
        const dx = (e.clientX - resizeState.startX) / viewport.zoom;
        const dy = (e.clientY - resizeState.startY) / viewport.zoom;
        const sc = resizeState.startConstraints;
        const newConstraints = { ...sc };
        const handle = resizeState.handle;

        // Horizontal
        if (handle.includes('left')) {
          if (sc.left !== undefined) newConstraints.left = Math.round(sc.left + dx);
          if (sc.width !== undefined && sc.right === undefined) newConstraints.width = Math.round(Math.max(10, sc.width - dx));
        }
        if (handle.includes('right') || handle === 'right') {
          if (sc.right !== undefined) newConstraints.right = Math.round(sc.right - dx);
          if (sc.width !== undefined && sc.left !== undefined && sc.right === undefined) newConstraints.width = Math.round(Math.max(10, sc.width + dx));
        }

        // Vertical
        if (handle.startsWith('top')) {
          if (sc.top !== undefined) newConstraints.top = Math.round(sc.top + dy);
          if (sc.height !== undefined && sc.bottom === undefined) newConstraints.height = Math.round(Math.max(10, sc.height - dy));
        }
        if (handle.includes('bottom')) {
          if (sc.bottom !== undefined) newConstraints.bottom = Math.round(sc.bottom - dy);
          if (sc.height !== undefined && sc.top !== undefined && sc.bottom === undefined) newConstraints.height = Math.round(Math.max(10, sc.height + dy));
        }

        updateConstraints(resizeState.componentId, newConstraints);
      }
    },
    [dragState, resizeState, viewport.zoom, updateConstraints]
  );

  const handlePointerUp = useCallback(() => {
    if (dragState) setDragState(null);
    if (resizeState) setResizeState(null);
  }, [dragState, resizeState, setDragState, setResizeState]);

  // Collect all bounds for selection overlay rendering with absolute positions.
  // Text components use DOM-measured sizes for accurate bounding boxes.
  function getAbsoluteBounds(
    components: LabelComponent[],
    boundsMap: Map<string, ResolvedBounds>,
    offsetX: number,
    offsetY: number
  ): Map<string, ResolvedBounds> {
    const result = new Map<string, ResolvedBounds>();
    for (const comp of components) {
      const b = boundsMap.get(comp.id);
      if (!b) continue;
      let w = b.width;
      let h = b.height;
      if (comp.typeData.type === 'text') {
        const measured = measuredSizes.get(comp.id);
        if (measured) {
          w = measured.width;
          h = measured.height;
        }
      }
      const abs = { x: b.x + offsetX, y: b.y + offsetY, width: w, height: h };
      result.set(comp.id, abs);
      if (comp.children) {
        const childAbs = getAbsoluteBounds(comp.children, boundsMap, abs.x, abs.y);
        childAbs.forEach((v, k) => result.set(k, v));
      }
    }
    return result;
  }

  const absoluteBoundsMap = useMemo(
    () => getAbsoluteBounds(document.components, boundsMap, 0, 0),
    [document.components, boundsMap, measuredSizes]
  );

  const selectedBounds = selectedId ? absoluteBoundsMap.get(selectedId) : null;

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-hidden bg-gray-100 relative"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Transform wrapper — centers the label, then applies pan and zoom */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) translate(-50%, -50%) scale(${viewport.zoom})`,
        }}
      >
        {/* Label surface */}
        <div
          className="bg-white shadow-lg relative"
          style={{ width: widthDots, height: heightDots }}
          onPointerDown={(e) => {
            // Click on the label background (not a component) deselects
            if (e.target === e.currentTarget) {
              selectComponent(null);
            }
          }}
        >
          {/* Grid */}
          {showGrid && (
            <svg
              className="absolute inset-0 pointer-events-none"
              width={widthDots}
              height={heightDots}
            >
              <defs>
                <pattern
                  id="grid"
                  width={gridSize}
                  height={gridSize}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          )}

          {/* Components */}
          {document.components.map((comp) => {
            const b = boundsMap.get(comp.id);
            if (!b) return null;
            if (comp.typeData.type === 'container') {
              return (
                <ContainerComponent
                  key={comp.id}
                  component={comp}
                  bounds={b}
                  boundsMap={boundsMap}
                />
              );
            }
            return (
              <CanvasComponent
                key={comp.id}
                component={comp}
                bounds={b}
                onDragStart={handleComponentPointerDown}
                onMeasure={handleMeasure}
              />
            );
          })}

          {/* Selection overlay */}
          {selectedId && selectedBounds && (
            <SelectionOverlay bounds={selectedBounds} componentId={selectedId} />
          )}
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white/80 rounded px-2 py-1 text-sm text-gray-600 font-mono">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}

function findComponentInTree(components: LabelComponent[], id: string): LabelComponent | null {
  for (const c of components) {
    if (c.id === id) return c;
    if (c.children) {
      const found = findComponentInTree(c.children, id);
      if (found) return found;
    }
  }
  return null;
}
