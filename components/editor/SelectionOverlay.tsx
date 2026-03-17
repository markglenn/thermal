'use client';

import type { ResolvedBounds, ResizeHandle, PinnableEdge } from '@/lib/types';
import { useEditorStore, beginUndoBatch } from '@/lib/store/editor-store';
import { findComponent } from '@/lib/utils';
import { getSizingMode } from '@/lib/components';

interface Props {
  bounds: ResolvedBounds;
  componentId: string;
}

const HANDLE_SIZE = 8;

const handles: { position: ResizeHandle; style: React.CSSProperties }[] = [
  { position: 'top-left', style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nwse-resize' } },
  { position: 'top', style: { top: -HANDLE_SIZE / 2, left: '50%', marginLeft: -HANDLE_SIZE / 2, cursor: 'ns-resize' } },
  { position: 'top-right', style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'nesw-resize' } },
  { position: 'right', style: { top: '50%', marginTop: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'ew-resize' } },
  { position: 'bottom-right', style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: 'nwse-resize' } },
  { position: 'bottom', style: { bottom: -HANDLE_SIZE / 2, left: '50%', marginLeft: -HANDLE_SIZE / 2, cursor: 'ns-resize' } },
  { position: 'bottom-left', style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'nesw-resize' } },
  { position: 'left', style: { top: '50%', marginTop: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: 'ew-resize' } },
];

export function SelectionOverlay({ bounds, componentId }: Props) {
  const setResizeState = useEditorStore((s) => s.setResizeState);
  const selectedComponent = useEditorStore((s) =>
    findComponent(s.document.components, componentId)
  );

  if (!selectedComponent) return null;

  const autoSized = getSizingMode(selectedComponent) === 'auto';

  // Auto-sized components render their own selection outline (handles rotation/transforms)
  if (autoSized) return null;

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
      {handles.map((h) => {
        // Hide handles that touch a pinned edge
        const pins = selectedComponent.pins ?? [];
        const isText = selectedComponent.typeData.type === 'text';
        const handleEdges: Record<ResizeHandle, PinnableEdge[]> = {
          'top-left': ['top', 'left'],
          'top': ['top'],
          'top-right': ['top', 'right'],
          'right': ['right'],
          'bottom-right': ['bottom', 'right'],
          'bottom': ['bottom'],
          'bottom-left': ['bottom', 'left'],
          'left': ['left'],
        };
        const touchesPinnedEdge = handleEdges[h.position].some((e) => pins.includes(e));
        if (touchesPinnedEdge) return null;

        // Text components: hide all handles that affect height
        const affectsHeight = ['top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(h.position);
        if (isText && affectsHeight) return null;

        // Image components: only corner handles (proportional resize)
        const isImage = selectedComponent.typeData.type === 'image';
        const isEdgeOnly = ['top', 'right', 'bottom', 'left'].includes(h.position);
        if (isImage && isEdgeOnly) return null;

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
              beginUndoBatch();
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
