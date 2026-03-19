'use client';

import { useEditorStoreContext } from '@/lib/store/editor-context';
import { useDocument } from '@/lib/store/editor-context';
import { labelWidthDots, labelHeightDots } from '@/lib/constants';
import { findComponent } from '@/lib/utils';
import type { ResolvedBounds } from '@/lib/types';

interface Props {
  absoluteBoundsMap: Map<string, ResolvedBounds>;
}

export function ConstraintGuides({ absoluteBoundsMap }: Props) {
  const dragState = useEditorStoreContext((s) => s.dragState);
  const selectedId = useEditorStoreContext((s) => s.selectedComponentIds.length === 1 ? s.selectedComponentIds[0] : null);
  const doc = useDocument();

  const labelW = labelWidthDots(doc.label);
  const labelH = labelHeightDots(doc.label);

  // Show guides when dragging or when selected
  const compId = dragState?.componentId ?? selectedId;
  if (!compId) return null;

  const comp = findComponent(doc.components, compId);
  if (!comp) return null;

  const bounds = absoluteBoundsMap.get(compId);
  if (!bounds) return null;

  // Only show during drag
  if (!dragState) return null;

  const { x, y, width, height } = bounds;
  const { horizontalAnchor, verticalAnchor, lockX, lockY } = comp.layout;

  // Locked axes use red (like center), unlocked use blue
  const hColor = lockX ? '#ef4444' : '#3b82f6';
  const vColor = lockY ? '#ef4444' : '#3b82f6';

  return (
    <svg className="absolute inset-0 pointer-events-none" width={labelW} height={labelH}>
      {/* Guide lines from anchored edges */}

      {/* Horizontal anchor guide: show distance from anchored horizontal edge */}
      {horizontalAnchor === 'left' && (
        <>
          <line x1={x} y1={0} x2={x} y2={labelH} stroke={hColor} strokeWidth={1} opacity={0.3} />
          <line x1={0} y1={y + height / 2} x2={x} y2={y + height / 2} stroke={hColor} strokeWidth={1} strokeDasharray="4 2" />
          <text x={x / 2} y={y + height / 2 - 4} textAnchor="middle" fontSize={10} fill={hColor} fontWeight="bold">{Math.round(comp.layout.x)}</text>
        </>
      )}
      {horizontalAnchor === 'right' && (
        <>
          <line x1={x + width} y1={0} x2={x + width} y2={labelH} stroke={hColor} strokeWidth={1} opacity={0.3} />
          <line x1={x + width} y1={y + height / 2} x2={labelW} y2={y + height / 2} stroke={hColor} strokeWidth={1} strokeDasharray="4 2" />
          <text x={x + width + (labelW - x - width) / 2} y={y + height / 2 - 4} textAnchor="middle" fontSize={10} fill={hColor} fontWeight="bold">{Math.round(comp.layout.x)}</text>
        </>
      )}
      {horizontalAnchor === 'center' && (
        <>
          {/* Prominent red centerline */}
          <line x1={labelW / 2} y1={0} x2={labelW / 2} y2={labelH} stroke="#ef4444" strokeWidth={1.5} opacity={0.5} />
          {/* Dashed red guides from left edge to component, and component to right edge */}
          <line x1={0} y1={y + height / 2} x2={x} y2={y + height / 2} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" opacity={0.5} />
          <line x1={x + width} y1={y + height / 2} x2={labelW} y2={y + height / 2} stroke="#ef4444" strokeWidth={1} strokeDasharray="4 2" opacity={0.5} />
          {/* Left/right edge lines */}
          <line x1={x} y1={0} x2={x} y2={labelH} stroke="#ef4444" strokeWidth={1} opacity={0.3} />
          <line x1={x + width} y1={0} x2={x + width} y2={labelH} stroke="#ef4444" strokeWidth={1} opacity={0.3} />
        </>
      )}

      {/* Vertical anchor guide: show distance from anchored vertical edge */}
      {verticalAnchor === 'top' && (
        <>
          <line x1={0} y1={y} x2={labelW} y2={y} stroke={vColor} strokeWidth={1} opacity={0.3} />
          <line x1={x + width / 2} y1={0} x2={x + width / 2} y2={y} stroke={vColor} strokeWidth={1} strokeDasharray="4 2" />
          <text x={x + width / 2 + 4} y={y / 2 + 3} textAnchor="start" fontSize={10} fill={vColor} fontWeight="bold">{Math.round(comp.layout.y)}</text>
        </>
      )}
      {verticalAnchor === 'bottom' && (
        <>
          <line x1={0} y1={y + height} x2={labelW} y2={y + height} stroke={vColor} strokeWidth={1} opacity={0.3} />
          <line x1={x + width / 2} y1={y + height} x2={x + width / 2} y2={labelH} stroke={vColor} strokeWidth={1} strokeDasharray="4 2" />
          <text x={x + width / 2 + 4} y={y + height + (labelH - y - height) / 2 + 3} textAnchor="start" fontSize={10} fill={vColor} fontWeight="bold">{Math.round(comp.layout.y)}</text>
        </>
      )}
    </svg>
  );
}
