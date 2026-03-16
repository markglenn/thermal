'use client';

import { useEditorStore } from '@/lib/store/editor-store';
import { useDocument } from '@/hooks/use-editor-store';
import { labelWidthDots, labelHeightDots } from '@/lib/constants';
import { findComponent } from '@/lib/utils';
import type { ResolvedBounds } from '@/lib/types';

interface Props {
  absoluteBoundsMap: Map<string, ResolvedBounds>;
}

export function ConstraintGuides({ absoluteBoundsMap }: Props) {
  const dragState = useEditorStore((s) => s.dragState);
  const selectedId = useEditorStore((s) => s.selectedComponentId);
  const doc = useDocument();

  const labelW = labelWidthDots(doc.label);
  const labelH = labelHeightDots(doc.label);

  // Show guides when dragging or when selected
  const compId = dragState?.componentId ?? selectedId;
  if (!compId) return null;

  const comp = findComponent(doc.components, compId);
  if (!comp || comp.pins.length === 0) return null;

  const bounds = absoluteBoundsMap.get(compId);
  if (!bounds) return null;

  const { x, y, width, height } = bounds;
  const pins = comp.pins;
  const c = comp.constraints;

  // Only show during drag
  if (!dragState) return null;

  const hPinned = pins.includes('left') || pins.includes('right');
  const vPinned = pins.includes('top') || pins.includes('bottom');

  return (
    <svg className="absolute inset-0 pointer-events-none" width={labelW} height={labelH}>
      {/* Full-width guide lines for locked axes */}
      {vPinned && (
        <>
          <line x1={0} y1={y} x2={labelW} y2={y} stroke="#ef4444" strokeWidth={1} opacity={0.3} />
          <line x1={0} y1={y + height} x2={labelW} y2={y + height} stroke="#ef4444" strokeWidth={1} opacity={0.3} />
        </>
      )}
      {hPinned && (
        <>
          <line x1={x} y1={0} x2={x} y2={labelH} stroke="#ef4444" strokeWidth={1} opacity={0.3} />
          <line x1={x + width} y1={0} x2={x + width} y2={labelH} stroke="#ef4444" strokeWidth={1} opacity={0.3} />
        </>
      )}

      {/* Left pin */}
      {pins.includes('left') && c.left !== undefined && (
        <>
          <line x1={0} y1={y + height / 2} x2={x} y2={y + height / 2} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
          <text x={x / 2} y={y + height / 2 - 4} textAnchor="middle" fontSize={10} fill="#ef4444" fontWeight="bold">{c.left}</text>
        </>
      )}

      {/* Right pin */}
      {pins.includes('right') && c.right !== undefined && (
        <>
          <line x1={x + width} y1={y + height / 2} x2={labelW} y2={y + height / 2} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
          <text x={x + width + (labelW - x - width) / 2} y={y + height / 2 - 4} textAnchor="middle" fontSize={10} fill="#ef4444" fontWeight="bold">{c.right}</text>
        </>
      )}

      {/* Top pin */}
      {pins.includes('top') && c.top !== undefined && (
        <>
          <line x1={x + width / 2} y1={0} x2={x + width / 2} y2={y} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
          <text x={x + width / 2 + 4} y={y / 2 + 3} textAnchor="start" fontSize={10} fill="#ef4444" fontWeight="bold">{c.top}</text>
        </>
      )}

      {/* Bottom pin */}
      {pins.includes('bottom') && c.bottom !== undefined && (
        <>
          <line x1={x + width / 2} y1={y + height} x2={x + width / 2} y2={labelH} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" />
          <text x={x + width / 2 + 4} y={y + height + (labelH - y - height) / 2 + 3} textAnchor="start" fontSize={10} fill="#ef4444" fontWeight="bold">{c.bottom}</text>
        </>
      )}
    </svg>
  );
}
