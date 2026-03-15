'use client';

import { useEditorStore } from '@/lib/store/editor-store';
import { useViewport } from '@/hooks/use-editor-store';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '@/lib/constants';

export function Toolbar() {
  const viewport = useViewport();
  const setViewport = useEditorStore((s) => s.setViewport);
  const showGrid = useEditorStore((s) => s.showGrid);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const resetDocument = useEditorStore((s) => s.resetDocument);
  const selectedId = useEditorStore((s) => s.selectedComponentId);
  const removeComponent = useEditorStore((s) => s.removeComponent);
  const duplicateComponent = useEditorStore((s) => s.duplicateComponent);

  const zoomIn = () => {
    const z = Math.min(MAX_ZOOM, viewport.zoom + ZOOM_STEP);
    setViewport(z, viewport.panX, viewport.panY);
  };

  const zoomOut = () => {
    const z = Math.max(MIN_ZOOM, viewport.zoom - ZOOM_STEP);
    setViewport(z, viewport.panX, viewport.panY);
  };

  const resetView = () => {
    setViewport(1, 0, 0);
  };

  return (
    <div className="h-10 border-b border-gray-200 bg-white flex items-center px-3 gap-2 text-sm">
      <span className="font-semibold text-gray-700 mr-4">Thermal</span>

      <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
        <button onClick={zoomOut} className="px-1.5 py-0.5 rounded hover:bg-gray-100" title="Zoom out">
          −
        </button>
        <button onClick={resetView} className="px-2 py-0.5 rounded hover:bg-gray-100 font-mono text-xs min-w-[3.5rem] text-center">
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button onClick={zoomIn} className="px-1.5 py-0.5 rounded hover:bg-gray-100" title="Zoom in">
          +
        </button>
      </div>

      <button
        onClick={toggleGrid}
        className={`px-2 py-0.5 rounded text-xs ${showGrid ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
      >
        Grid
      </button>

      <div className="flex-1" />

      {selectedId && (
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
          <button
            onClick={() => duplicateComponent(selectedId)}
            className="px-2 py-0.5 rounded hover:bg-gray-100 text-xs"
          >
            Duplicate
          </button>
          <button
            onClick={() => removeComponent(selectedId)}
            className="px-2 py-0.5 rounded hover:bg-red-50 text-red-600 text-xs"
          >
            Delete
          </button>
        </div>
      )}

      <button
        onClick={resetDocument}
        className="px-2 py-0.5 rounded hover:bg-gray-100 text-xs text-gray-500"
      >
        Reset
      </button>
    </div>
  );
}
