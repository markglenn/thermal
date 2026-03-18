'use client';

import type { ResolvedBounds, ResizeHandle, PinnableEdge } from '@/lib/types';
import { useEditorStoreContext } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { getSizingMode } from '@/lib/components';

interface Props {
  bounds: ResolvedBounds;
  componentId: string;
  showHandles?: boolean;
}

const HANDLE_SIZE = 8;

const allHandles: { position: ResizeHandle; style: React.CSSProperties }[] = [
  { position: 'top-left', style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nwse-resize' } },
  { position: 'top', style: { top: -HANDLE_SIZE / 2, left: '50%', marginLeft: -HANDLE_SIZE / 2, cursor: 'ns-resize' } },
  { position: 'top-right', style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'nesw-resize' } },
  { position: 'right', style: { top: '50%', marginTop: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'ew-resize' } },
  { position: 'bottom-right', style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'nwse-resize' } },
  { position: 'bottom', style: { bottom: -HANDLE_SIZE / 2, left: '50%', marginLeft: -HANDLE_SIZE / 2, cursor: 'ns-resize' } },
  { position: 'bottom-left', style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nesw-resize' } },
  { position: 'left', style: { top: '50%', marginTop: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'ew-resize' } },
];

const HANDLE_EDGES: Record<ResizeHandle, PinnableEdge[]> = {
  'top-left': ['top', 'left'],
  'top': ['top'],
  'top-right': ['top', 'right'],
  'right': ['right'],
  'bottom-right': ['bottom', 'right'],
  'bottom': ['bottom'],
  'bottom-left': ['bottom', 'left'],
  'left': ['left'],
};

// Handles that affect height
const HEIGHT_HANDLES = new Set<ResizeHandle>(['top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right']);
// Handles that affect width
const WIDTH_HANDLES = new Set<ResizeHandle>(['left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right']);
// Edge-only handles (not corners)
const EDGE_HANDLES = new Set<ResizeHandle>(['top', 'right', 'bottom', 'left']);

export function SelectionOverlay({ bounds, componentId, showHandles = true }: Props) {
  const setResizeState = useEditorStoreContext((s) => s.setResizeState);
  const selectedComponent = useEditorStoreContext((s) =>
    findComponent(s.document.components, componentId)
  );

  if (!selectedComponent) return null;

  const sizing = getSizingMode(selectedComponent);
  const pins = selectedComponent.pins ?? [];
  const isImage = selectedComponent.typeData.type === 'image';

  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ outline: '2px solid #3b82f6' }} />
      {showHandles && allHandles.map((h) => {
        // Sizing mode restrictions
        if (sizing === 'auto') return null;
        if (sizing === 'width-only' && HEIGHT_HANDLES.has(h.position)) return null;

        // Hide handles that touch a pinned edge
        if (HANDLE_EDGES[h.position].some((e) => pins.includes(e))) return null;

        // Image: only corner handles (proportional resize)
        if (isImage && EDGE_HANDLES.has(h.position)) return null;

        return (
          <div
            key={h.position}
            className="pointer-events-auto absolute bg-white border-2 border-blue-500"
            style={{
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              ...h.style,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setResizeState({
                componentId,
                handle: h.position,
                startX: e.clientX,
                startY: e.clientY,
                startConstraints: { ...selectedComponent.constraints },
              });
            }}
          />
        );
      })}
    </div>
  );
}
