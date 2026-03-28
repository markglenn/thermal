import type { ResolvedBounds } from './types';

export const SNAP_THRESHOLD = 5; // dots

export interface SnapGuide {
  axis: 'h' | 'v';
  /** Position along the axis (x for vertical lines, y for horizontal lines) */
  position: number;
  /** Start of the guide line on the cross-axis */
  from: number;
  /** End of the guide line on the cross-axis */
  to: number;
}

/** Pre-computed snap targets for one axis: sorted positions + a map from position to cross-axis extent. */
export interface SnapAxis {
  /** Sorted unique target positions */
  positions: number[];
  /** For each target position, the min/max extent on the cross-axis (for guide line rendering) */
  extents: Map<number, { from: number; to: number }>;
}

/**
 * Build snap axis data from non-dragged components + label edges.
 * Called once at drag start.
 */
export function buildSnapAxis(
  boundsMap: Map<string, ResolvedBounds>,
  draggedIds: Set<string>,
  labelSize: number,
  axis: 'x' | 'y',
): SnapAxis {
  const extents = new Map<number, { from: number; to: number }>();

  function addTarget(pos: number, crossFrom: number, crossTo: number) {
    const existing = extents.get(pos);
    if (existing) {
      existing.from = Math.min(existing.from, crossFrom);
      existing.to = Math.max(existing.to, crossTo);
    } else {
      extents.set(pos, { from: crossFrom, to: crossTo });
    }
  }

  // Label edges + center (use full cross-axis extent)
  addTarget(0, 0, labelSize);
  addTarget(labelSize, 0, labelSize);
  addTarget(Math.round(labelSize / 2), 0, labelSize);

  for (const [id, b] of boundsMap) {
    if (draggedIds.has(id)) continue;
    if (axis === 'x') {
      addTarget(b.x, b.y, b.y + b.height);
      addTarget(b.x + b.width, b.y, b.y + b.height);
      addTarget(Math.round(b.x + b.width / 2), b.y, b.y + b.height);
    } else {
      addTarget(b.y, b.x, b.x + b.width);
      addTarget(b.y + b.height, b.x, b.x + b.width);
      addTarget(Math.round(b.y + b.height / 2), b.x, b.x + b.width);
    }
  }

  const positions = Array.from(extents.keys()).sort((a, b) => a - b);
  return { positions, extents };
}

/**
 * Find the nearest target within threshold. Returns offset to snap, or 0.
 * Uses sorted array for early exit.
 */
function findSnap(value: number, positions: number[], threshold: number): { target: number; offset: number } | null {
  let bestTarget = 0;
  let bestDist = threshold + 1;

  for (let i = 0; i < positions.length; i++) {
    const dist = Math.abs(value - positions[i]);
    if (dist < bestDist) {
      bestDist = dist;
      bestTarget = positions[i];
    }
    // Since sorted, if we've passed the value and dist is growing, stop
    if (positions[i] > value + threshold) break;
  }

  if (bestDist <= threshold) {
    return { target: bestTarget, offset: bestTarget - value };
  }
  return null;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

const EMPTY_RESULT: SnapResult = { dx: 0, dy: 0, guides: [] };

/**
 * Given the dragged bounds after raw movement, compute snap adjustments and guide lines.
 */
export function computeSnap(
  dragBounds: ResolvedBounds,
  xAxis: SnapAxis,
  yAxis: SnapAxis,
  threshold = SNAP_THRESHOLD,
): SnapResult {
  // Find best x snap across left, center, right edges
  const xEdge0 = dragBounds.x;
  const xEdge1 = Math.round(dragBounds.x + dragBounds.width / 2);
  const xEdge2 = dragBounds.x + dragBounds.width;

  let bestXOffset = 0;
  let bestXDist = threshold + 1;

  for (const edge of [xEdge0, xEdge1, xEdge2]) {
    const snap = findSnap(edge, xAxis.positions, threshold);
    if (snap && Math.abs(snap.offset) < bestXDist) {
      bestXDist = Math.abs(snap.offset);
      bestXOffset = snap.offset;
    }
  }

  // Find best y snap across top, center, bottom edges
  const yEdge0 = dragBounds.y;
  const yEdge1 = Math.round(dragBounds.y + dragBounds.height / 2);
  const yEdge2 = dragBounds.y + dragBounds.height;

  let bestYOffset = 0;
  let bestYDist = threshold + 1;

  for (const edge of [yEdge0, yEdge1, yEdge2]) {
    const snap = findSnap(edge, yAxis.positions, threshold);
    if (snap && Math.abs(snap.offset) < bestYDist) {
      bestYDist = Math.abs(snap.offset);
      bestYOffset = snap.offset;
    }
  }

  if (bestXOffset === 0 && bestYOffset === 0) return EMPTY_RESULT;

  // Build guides only for snapped axes
  const guides: SnapGuide[] = [];

  if (bestXOffset !== 0) {
    const snappedX = dragBounds.x + bestXOffset;
    const snappedEdges = [snappedX, Math.round(snappedX + dragBounds.width / 2), snappedX + dragBounds.width];
    for (const edge of snappedEdges) {
      const extent = xAxis.extents.get(edge);
      if (extent) {
        guides.push({
          axis: 'v',
          position: edge,
          from: Math.min(extent.from, dragBounds.y + bestYOffset),
          to: Math.max(extent.to, dragBounds.y + bestYOffset + dragBounds.height),
        });
      }
    }
  }

  if (bestYOffset !== 0) {
    const snappedY = dragBounds.y + bestYOffset;
    const snappedEdges = [snappedY, Math.round(snappedY + dragBounds.height / 2), snappedY + dragBounds.height];
    for (const edge of snappedEdges) {
      const extent = yAxis.extents.get(edge);
      if (extent) {
        guides.push({
          axis: 'h',
          position: edge,
          from: Math.min(extent.from, dragBounds.x + bestXOffset),
          to: Math.max(extent.to, dragBounds.x + bestXOffset + dragBounds.width),
        });
      }
    }
  }

  return { dx: bestXOffset, dy: bestYOffset, guides };
}
