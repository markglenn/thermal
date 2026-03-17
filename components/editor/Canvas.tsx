'use client';

import { useRef, useCallback, useMemo } from 'react';
import { useEditorStore } from '@/lib/store/editor-store';
import { useDocument, useViewport } from '@/hooks/use-editor-store';
import { findComponent } from '@/lib/utils';
import { labelWidthDots, labelHeightDots } from '@/lib/constants';
import { useCanvasZoomPan } from '@/hooks/use-canvas-zoom-pan';
import { useCanvasDrag } from '@/hooks/use-canvas-drag';
import { useCanvasResize } from '@/hooks/use-canvas-resize';
import { usePaletteDrop } from '@/hooks/use-palette-drop';
import { useAbsoluteBounds } from '@/hooks/use-absolute-bounds';
import { CanvasComponent } from './CanvasComponent';
import { ContainerComponent } from './ContainerComponent';
import { SelectionOverlay } from './SelectionOverlay';
import { ConstraintGuides } from './ConstraintGuides';
import { GridOverlay } from './GridOverlay';
import { reconvertImageAtBounds } from '@/lib/components/image/reconvert';

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const document = useDocument();
  const viewport = useViewport();
  const selectedId = useEditorStore((s) => s.selectedComponentId);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const showGrid = useEditorStore((s) => s.showGrid);
  const gridSize = useEditorStore((s) => s.gridSize);
  const setDragState = useEditorStore((s) => s.setDragState);
  const setResizeState = useEditorStore((s) => s.setResizeState);

  const widthDots = labelWidthDots(document.label);
  const heightDots = labelHeightDots(document.label);

  const { handlePointerDown, isPanning } = useCanvasZoomPan(canvasRef, document.label);
  const { handleComponentPointerDown, handleDragMove, dragState } = useCanvasDrag();
  const { handleResizeMove, resizeState } = useCanvasResize();
  const { handleDrop } = usePaletteDrop(labelRef);
  const { boundsMap, absoluteBoundsMap, handleMeasure } = useAbsoluteBounds();

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      handleDragMove(e);
      handleResizeMove(e);
    },
    [handleDragMove, handleResizeMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragState) {
        setDragState(null);
      }
      if (resizeState) {
        reconvertImageAtBounds(resizeState.componentId);
        setResizeState(null);
      }
      handleDrop(e);
    },
    [dragState, resizeState, setDragState, setResizeState, handleDrop]
  );

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      canvasRef.current?.focus();
      handlePointerDown(e);
    },
    [handlePointerDown]
  );

  const selectedBounds = selectedId ? absoluteBoundsMap.get(selectedId) : null;

  // Cursor based on pinned axes during drag
  const dragCursor = useMemo(() => {
    if (!dragState) return undefined;
    const comp = findComponent(document.components, dragState.componentId);
    if (!comp || comp.pins.length === 0) return undefined;
    const hPinned = comp.pins.includes('left') || comp.pins.includes('right');
    const vPinned = comp.pins.includes('top') || comp.pins.includes('bottom');
    if (hPinned && vPinned) return 'not-allowed';
    if (vPinned) return 'ew-resize';
    if (hPinned) return 'ns-resize';
    return undefined;
  }, [dragState, document.components]);

  return (
    <div
      ref={canvasRef}
      tabIndex={0}
      className="flex-1 overflow-hidden bg-gray-100 relative outline-none"
      style={{ cursor: dragCursor ?? (isPanning ? 'grabbing' : 'grab') }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Transform wrapper */}
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
            if (e.target === e.currentTarget) selectComponent(null);
          }}
        >
          {showGrid && <GridOverlay width={widthDots} height={heightDots} gridSize={gridSize} />}

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

          {/* Constraint guides */}
          <ConstraintGuides absoluteBoundsMap={absoluteBoundsMap} />
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-white/80 rounded px-2 py-1 text-sm text-gray-600 font-mono">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}
