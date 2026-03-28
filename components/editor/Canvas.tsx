'use client';

import { useRef, useCallback, useMemo, useEffect } from 'react';
import { useEditorStoreContext, useEditorStoreApi, useDocument, useViewport } from '@/lib/store/editor-context';
import { EDITOR_EVENTS } from '@/hooks/use-keyboard-shortcuts';
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
import { Ruler } from './Ruler';
import { SmartGuides } from './SmartGuides';
import { getSnapGuides, setSnapGuides } from '@/lib/snap-guides-store';
import { reconvertImageAtBounds } from '@/lib/components/image/reconvert';

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const document = useDocument();
  const viewport = useViewport();
  const selectedIds = useEditorStoreContext((s) => s.selectedComponentIds);
  const showGrid = useEditorStoreContext((s) => s.showGrid);
  const showRulers = useEditorStoreContext((s) => s.showRulers);
  const gridSize = useEditorStoreContext((s) => s.gridSize);
  const setDragState = useEditorStoreContext((s) => s.setDragState);
  const setResizeState = useEditorStoreContext((s) => s.setResizeState);
  const readOnly = useEditorStoreContext((s) => s.readOnly);
  // Read snap guides directly — updated by the drag hook before layout updates,
  // so they're fresh when Canvas re-renders from the layout change. No subscription
  // needed, which avoids a double render per pointer move.
  const snapGuides = getSnapGuides();
  const storeApi = useEditorStoreApi();

  const widthDots = labelWidthDots(document.label);
  const heightDots = labelHeightDots(document.label);

  const { handlePointerDown, handleSpacePanCapture, isPanning, isSpaceHeld, fitToView } = useCanvasZoomPan(canvasRef, document.label);

  useEffect(() => {
    const handler = () => fitToView();
    window.addEventListener(EDITOR_EVENTS.FIT_TO_VIEW, handler);
    return () => window.removeEventListener(EDITOR_EVENTS.FIT_TO_VIEW, handler);
  }, [fitToView]);

  const { handleComponentPointerDown, handleDragMove: rawDragMove, dragState } = useCanvasDrag();
  const { handleResizeMove: rawResizeMove, resizeState } = useCanvasResize();
  const { handleDrop: rawHandleDrop } = usePaletteDrop(labelRef);

  // Disable mutation interactions in read-only mode (selection still allowed via rawComponentPointerDown)
  const handleDragMove = useCallback(
    (e: React.PointerEvent) => { if (!readOnly) rawDragMove(e); },
    [readOnly, rawDragMove]
  );
  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => { if (!readOnly) rawResizeMove(e); },
    [readOnly, rawResizeMove]
  );
  const handleDrop = useCallback(
    (e: React.PointerEvent) => { if (!readOnly) rawHandleDrop(e); },
    [readOnly, rawHandleDrop]
  );
  const { boundsMap, absoluteBoundsMap, handleMeasure } = useAbsoluteBounds();
  const { marquee, handleLabelPointerDown, startMarquee } = useMarqueeSelect(labelRef, absoluteBoundsMap);

  // Combined bounding box of selected components for ruler highlights
  const selectionBounds = useMemo(() => {
    if (selectedIds.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;
    for (const id of selectedIds) {
      const b = absoluteBoundsMap.get(id);
      if (!b) continue;
      found = true;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    if (!found) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [selectedIds, absoluteBoundsMap]);

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
        setSnapGuides([]);
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
      // Left-click on canvas background (outside label): start marquee
      if (e.button === 0 && !labelRef.current?.contains(e.target as Node)) {
        startMarquee(e);
      }
    },
    [handlePointerDown, startMarquee]
  );

  // For single selection, show resize handles. For multi-select, show outlines only.
  const primarySelectedId = selectedIds.length === 1 ? selectedIds[0] : null;

  return (
    <div
      ref={canvasRef}
      tabIndex={0}
      data-testid="canvas"
      className="flex-1 overflow-hidden bg-gray-100 relative outline-none"
      style={{ cursor: dragState ? 'grabbing' : isPanning ? 'grabbing' : isSpaceHeld ? 'grab' : 'default' }}
      onPointerDownCapture={handleSpacePanCapture}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
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
          data-testid="label-surface"
          className="bg-white shadow-lg relative"
          style={{ width: widthDots, height: heightDots, cursor: isSpaceHeld ? undefined : 'default' }}
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

          {/* Smart guides (snap-to-edge) */}
          <SmartGuides guides={snapGuides} labelWidth={widthDots} labelHeight={heightDots} />
        </div>
      </div>

      {/* Rulers */}
      {showRulers && <Ruler canvasRef={canvasRef} selectionBounds={selectionBounds} />}

      {/* Zoom indicator — click to fit */}
      <button
        type="button"
        data-testid="zoom-indicator"
        className="absolute bottom-4 right-4 bg-white/80 hover:bg-blue-500 hover:text-white rounded px-2 py-1 text-sm text-gray-600 font-mono cursor-pointer transition-colors"
        title="Fit to view"
        onClick={fitToView}
      >
        {Math.round(viewport.zoom * 100)}%
      </button>
    </div>
  );
}
