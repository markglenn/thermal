'use client';

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';
import { useDocument, useViewport } from '@/hooks/use-editor-store';
import { resolveDocument } from '@/lib/constraints/resolver';
import { labelWidthDots, labelHeightDots, MIN_ZOOM, MAX_ZOOM } from '@/lib/constants';
import { CanvasComponent } from './CanvasComponent';
import { ContainerComponent } from './ContainerComponent';
import { SelectionOverlay } from './SelectionOverlay';
import { ConstraintGuides } from './ConstraintGuides';
import type { LabelComponent, ResolvedBounds, Constraints } from '@/lib/types';
import { findComponent, isAutoSized, hasFieldBlock } from '@/lib/utils';

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
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
  const setPaletteDropState = useEditorStore((s) => s.setPaletteDropState);
  const addComponent = useEditorStore((s) => s.addComponent);

  const widthDots = labelWidthDots(document.label);
  const heightDots = labelHeightDots(document.label);

  // Track actual measured sizes for auto-sized components
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

  // Fit label in viewport on mount
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

  const boundsMap = useMemo(() => resolveDocument(document), [document]);

  // Clamp pan so at least 15px of the label stays visible
  const clampPanRef = useRef((panX: number, panY: number, zoom: number) => ({ panX, panY }));
  useEffect(() => {
    clampPanRef.current = (panX: number, panY: number, zoom: number) => {
      if (!canvasRef.current) return { panX, panY };
      const canvas = canvasRef.current.getBoundingClientRect();
      const margin = 15;
      const labelW = widthDots * zoom;
      const labelH = heightDots * zoom;
      const maxPanX = canvas.width / 2 + labelW / 2 - margin;
      const maxPanY = canvas.height / 2 + labelH / 2 - margin;
      return {
        panX: Math.max(-maxPanX, Math.min(maxPanX, panX)),
        panY: Math.max(-maxPanY, Math.min(maxPanY, panY)),
      };
    };
  }, [widthDots, heightDots]);

  // Non-passive wheel handler for zoom/pan
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const store = useEditorStore.getState();
      const { zoom, panX, panY } = store.viewport;
      if (e.ctrlKey || e.metaKey) {
        const factor = 1 - e.deltaY * 0.005;
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
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1) {
        e.preventDefault();
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
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return;
      }

      if (e.button === 0) {
        selectComponent(null);
      }
    },
    [selectComponent]
  );

  const handleComponentPointerDown = useCallback(
    (e: React.PointerEvent, componentId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      selectComponent(componentId);

      const comp = findComponent(useEditorStore.getState().document.components, componentId);
      if (!comp) return;

      setDragState({
        componentId,
        startX: e.clientX,
        startY: e.clientY,
        startConstraints: { ...comp.constraints },
      });
    },
    [selectComponent, setDragState]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragState) {
        const zoom = useEditorStore.getState().viewport.zoom;
        const dx = (e.clientX - dragState.startX) / zoom;
        const dy = (e.clientY - dragState.startY) / zoom;
        const sc = dragState.startConstraints;
        const comp = findComponent(useEditorStore.getState().document.components, dragState.componentId);
        const pins = comp?.pins ?? [];
        const newConstraints: Partial<Constraints> = {};

        const hPinned = pins.includes('left') || pins.includes('right');
        if (!hPinned) {
          newConstraints.left = Math.round((sc.left ?? 0) + dx);
        }

        const vPinned = pins.includes('top') || pins.includes('bottom');
        if (!vPinned) {
          newConstraints.top = Math.round((sc.top ?? 0) + dy);
        }

        if (Object.keys(newConstraints).length > 0) {
          updateConstraints(dragState.componentId, newConstraints);
        }
      }

      if (resizeState) {
        const zoom = useEditorStore.getState().viewport.zoom;
        const dx = (e.clientX - resizeState.startX) / zoom;
        const dy = (e.clientY - resizeState.startY) / zoom;
        const sc = resizeState.startConstraints;
        const newConstraints = { ...sc };
        const handle = resizeState.handle;

        if (handle.includes('left')) {
          if (sc.left !== undefined) newConstraints.left = Math.round(sc.left + dx);
          if (sc.width !== undefined && sc.right === undefined) newConstraints.width = Math.round(Math.max(10, sc.width - dx));
        }
        if (handle.includes('right') || handle === 'right') {
          if (sc.right !== undefined) newConstraints.right = Math.round(sc.right - dx);
          if (sc.width !== undefined && sc.left !== undefined && sc.right === undefined) newConstraints.width = Math.round(Math.max(10, sc.width + dx));
        }

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
    [dragState, resizeState, updateConstraints]
  );

  const screenToDots = useCallback(
    (clientX: number, clientY: number): { left: number; top: number } | null => {
      if (!labelRef.current) return null;
      const labelRect = labelRef.current.getBoundingClientRect();
      const { zoom } = useEditorStore.getState().viewport;
      const left = Math.round((clientX - labelRect.left) / zoom);
      const top = Math.round((clientY - labelRect.top) / zoom);
      return { left, top };
    },
    []
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragState) setDragState(null);
      if (resizeState) setResizeState(null);

      const dropState = useEditorStore.getState().paletteDropState;
      if (dropState) {
        const dots = screenToDots(e.clientX, e.clientY);
        if (dots && dots.left >= 0 && dots.top >= 0) {
          addComponent(dropState.type, { left: dots.left, top: dots.top });
        }
        setPaletteDropState(null);
      }
    },
    [dragState, resizeState, setDragState, setResizeState, screenToDots, addComponent, setPaletteDropState]
  );

  const absoluteBoundsMap = useMemo(() => {
    function walk(
      components: LabelComponent[],
      bMap: Map<string, ResolvedBounds>,
      measured: Map<string, { width: number; height: number }>,
      offsetX: number,
      offsetY: number,
      result: Map<string, ResolvedBounds>
    ) {
      for (const comp of components) {
        const b = bMap.get(comp.id);
        if (!b) continue;
        let w = b.width;
        let h = b.height;
        if (hasFieldBlock(comp)) {
          const m = measured.get(comp.id);
          if (m) h = m.height;
        } else if (isAutoSized(comp)) {
          const m = measured.get(comp.id);
          if (m) { w = m.width; h = m.height; }
        }
        const abs = { x: b.x + offsetX, y: b.y + offsetY, width: w, height: h };
        result.set(comp.id, abs);
        if (comp.children) {
          walk(comp.children, bMap, measured, abs.x, abs.y, result);
        }
      }
    }
    const result = new Map<string, ResolvedBounds>();
    walk(document.components, boundsMap, measuredSizes, 0, 0, result);
    return result;
  }, [document, boundsMap, measuredSizes]);

  const selectedBounds = selectedId ? absoluteBoundsMap.get(selectedId) : null;

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      canvasRef.current?.focus();
      handlePointerDown(e);
    },
    [handlePointerDown]
  );

  return (
    <div
      ref={canvasRef}
      tabIndex={0}
      className="flex-1 overflow-hidden bg-gray-100 relative outline-none"
      onPointerDown={handleCanvasPointerDown}
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
          ref={labelRef}
          className="bg-white shadow-lg relative"
          style={{ width: widthDots, height: heightDots }}
          onPointerDown={(e) => {
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
                  onDragStart={handleComponentPointerDown}
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

          {/* Constraint guides (shown during drag) */}
          <ConstraintGuides />
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white/80 rounded px-2 py-1 text-sm text-gray-600 font-mono">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}
