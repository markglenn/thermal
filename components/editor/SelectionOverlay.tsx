'use client';

import type { ResolvedBounds, ResizeHandle } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';

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
  const selectedComponent = useEditorStore((s) => {
    function find(comps: typeof s.document.components): typeof s.document.components[0] | undefined {
      for (const c of comps) {
        if (c.id === componentId) return c;
        if (c.children) { const f = find(c.children); if (f) return f; }
      }
      return undefined;
    }
    return find(s.document.components);
  });

  if (!selectedComponent) return null;

  const autoSized = ['text', 'barcode', 'qrcode'].includes(selectedComponent.typeData.type);

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
      {/* Outline instead of border so it doesn't overlap content */}
      <div className="absolute inset-0 pointer-events-none" style={{ outline: '2px solid #3b82f6' }} />
      {!autoSized && handles.map((h) => (
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
      ))}
    </div>
  );
}
