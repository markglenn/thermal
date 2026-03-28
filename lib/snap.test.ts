import { describe, it, expect } from 'vitest';
import { buildSnapAxis, computeSnap, SNAP_THRESHOLD } from './snap';
import type { ResolvedBounds } from './types';

function makeBounds(x: number, y: number, width: number, height: number): ResolvedBounds {
  return { x, y, width, height };
}

describe('buildSnapAxis', () => {
  it('includes label edges and center', () => {
    const map = new Map<string, ResolvedBounds>();
    const axis = buildSnapAxis(map, new Set(), 400, 'x');
    expect(axis.positions).toContain(0);
    expect(axis.positions).toContain(400);
    expect(axis.positions).toContain(200);
  });

  it('includes component edges and center', () => {
    const map = new Map([['a', makeBounds(100, 50, 60, 40)]]);
    const axis = buildSnapAxis(map, new Set(), 400, 'x');
    expect(axis.positions).toContain(100); // left
    expect(axis.positions).toContain(160); // right
    expect(axis.positions).toContain(130); // center
  });

  it('excludes dragged components', () => {
    const map = new Map([['a', makeBounds(100, 50, 60, 40)]]);
    const axis = buildSnapAxis(map, new Set(['a']), 400, 'x');
    expect(axis.positions).not.toContain(100);
    expect(axis.positions).not.toContain(160);
    expect(axis.positions).not.toContain(130);
  });

  it('deduplicates positions', () => {
    const map = new Map([
      ['a', makeBounds(100, 0, 100, 10)], // right edge = 200 = label center
    ]);
    const axis = buildSnapAxis(map, new Set(), 400, 'x');
    const count200 = axis.positions.filter((p) => p === 200).length;
    expect(count200).toBe(1);
  });

  it('stores cross-axis extents', () => {
    const map = new Map([['a', makeBounds(100, 20, 60, 40)]]);
    const axis = buildSnapAxis(map, new Set(), 400, 'x');
    const extent = axis.extents.get(100);
    expect(extent).toBeDefined();
    expect(extent!.from).toBe(20);
    expect(extent!.to).toBe(60);
  });
});

describe('computeSnap', () => {
  const labelW = 400;
  const labelH = 200;

  // Target component at (200, 80, 60, 40)
  const allBounds = new Map([
    ['target', makeBounds(200, 80, 60, 40)],
    ['dragged', makeBounds(0, 0, 50, 30)],
  ]);
  const draggedIds = new Set(['dragged']);
  const xAxis = buildSnapAxis(allBounds, draggedIds, labelW, 'x');
  const yAxis = buildSnapAxis(allBounds, draggedIds, labelH, 'y');

  it('snaps left edge to target left edge within threshold', () => {
    const dragBounds = makeBounds(197, 10, 50, 30);
    const result = computeSnap(dragBounds, xAxis, yAxis);
    expect(result.dx).toBe(3);
    expect(result.guides.length).toBeGreaterThan(0);
    expect(result.guides.some((g) => g.axis === 'v' && g.position === 200)).toBe(true);
  });

  it('snaps right edge to target right edge within threshold', () => {
    const dragBounds = makeBounds(208, 10, 50, 30);
    const result = computeSnap(dragBounds, xAxis, yAxis);
    expect(result.dx).toBe(2); // 260 - 258 = 2
  });

  it('does not snap when outside threshold', () => {
    const dragBounds = makeBounds(190, 10, 50, 30);
    const result = computeSnap(dragBounds, xAxis, yAxis, SNAP_THRESHOLD);
    expect(result.dx).toBe(0);
  });

  it('snaps to label edge', () => {
    const dragBounds = makeBounds(198, 10, 50, 30);
    const result = computeSnap(dragBounds, xAxis, yAxis);
    expect(result.dx).toBe(2); // snaps left edge to 200 (target left / label center)
  });

  it('returns empty guides when no snap', () => {
    const dragBounds = makeBounds(50, 50, 50, 20);
    const result = computeSnap(dragBounds, xAxis, yAxis);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.guides).toHaveLength(0);
  });

  it('snaps y axis independently of x', () => {
    const dragBounds = makeBounds(50, 77, 50, 30);
    const result = computeSnap(dragBounds, xAxis, yAxis);
    expect(result.dy).toBe(3);
    expect(result.guides.some((g) => g.axis === 'h' && g.position === 80)).toBe(true);
  });

  it('picks the closest snap when multiple edges match', () => {
    const dragBounds = makeBounds(149, 10, 50, 30);
    const result = computeSnap(dragBounds, xAxis, yAxis);
    expect(result.dx).toBe(1); // right edge 199 → 200
  });
});
