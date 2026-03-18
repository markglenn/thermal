'use client';

import { useRef, useCallback } from 'react';
import { useEditorStoreContext, useEditorStoreApi, useDocument, useViewport } from '@/lib/store/editor-context';
import { labelWidthDots, labelHeightDots } from '@/lib/constants';
import { useCanvasZoomPan } from '@/hooks/use-canvas-zoom-pan';
import { useCanvasDrag } from '@/hooks/use-canvas-drag';
import { useCanvasResize } from '@/hooks/use-canvas-resize';
import { usePaletteDrop } from '@/hooks/use-palette-drop';
import { useAbsoluteBounds } from '@/hooks/use-absolute-bounds';
import { useMarqueeSelect } from '@/hooks/use-marquee-select';
import { CanvasComponent } from './CanvasComponent';
import { SelectionOverlay } from './SelectionOverlay';
import { ConstraintGuides } from './ConstraintGuides';
import { GridOverlay } from './GridOverlay';
import { reconvertImageAtBounds } from '@/lib/components/image/reconvert';

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const document = useDocument();
  const viewport = useViewport();
  const selectedIds = useEditorStoreContext((s) => s.selectedComponentIds);
  const showGrid = useEditorStoreContext((s) => s.showGrid);
  const gridSize = useEditorStoreContext((s) => s.gridSize);
  const setDragState = useEditorStoreContext((s) => s.setDragState);
  const setResizeState = useEditorStoreContext((s) => s.setResizeState);
  const storeApi = useEditorStoreApi();

  const widthDots = labelWidthDots(document.label);
  const heightDots = labelHeightDots(document.label);

  const { handlePointerDown, isPanning } = useCanvasZoomPan(canvasRef, document.label, labelRef);
  const { handleComponentPointerDown, handleDragMove, dragState } = useCanvasDrag();
  const { handleResizeMove, resizeState } = useCanvasResize();
  const { handleDrop } = usePaletteDrop(labelRef);
  const { boundsMap, absoluteBoundsMap, handleMeasure } = useAbsoluteBounds();
  const { marquee, handleLabelPointerDown } = useMarqueeSelect(labelRef, absoluteBoundsMap);

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
        reconvertImageAtBounds(resizeState.componentId, storeApi);
        setResizeState(null);
      }
      handleDrop(e);
    },
    [dragState, resizeState, setDragState, setResizeState, handleDrop, storeApi]
  );

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      canvasRef.current?.focus();
      handlePointerDown(e);
    },
    [handlePointerDown]
  );

  // For single selection, show resize handles. For multi-select, show outlines only.
  const primarySelectedId = selectedIds.length === 1 ? selectedIds[0] : null;

  return (
    <div
      ref={canvasRef}
      tabIndex={0}
      className="flex-1 overflow-hidden bg-gray-100 relative outline-none"
      style={{ cursor: dragState ? 'grabbing' : (isPanning ? 'grabbing' : 'grab') }}
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
          style={{ width: widthDots, height: heightDots, cursor: 'default' }}
          onPointerDown={handleLabelPointerDown}
        >
          {showGrid && <GridOverlay width={widthDots} height={heightDots} gridSize={gridSize} />}

          {/* Components */}
          {document.components.map((comp) => {
            const b = boundsMap.get(comp.id);
            if (!b) return null;
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

          {/* Selection overlays */}
          {selectedIds.map((sid) => {
            const sBounds = absoluteBoundsMap.get(sid);
            if (!sBounds) return null;
            return <SelectionOverlay key={sid} bounds={sBounds} componentId={sid} showHandles={sid === primarySelectedId} />;
          })}

          {/* Marquee selection rectangle */}
          {marquee && marquee.width > 2 && marquee.height > 2 && (
            <div
              className="absolute pointer-events-none border border-blue-500 bg-blue-500/10"
              style={{
                left: marquee.x,
                top: marquee.y,
                width: marquee.width,
                height: marquee.height,
              }}
            />
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
