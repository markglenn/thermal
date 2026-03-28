import { describe, it, expect } from 'vitest';
import {
  dotToScreen,
  screenToDot,
  computeTickInterval,
  computeVisibleDotRange,
} from './ruler-utils';

describe('dotToScreen / screenToDot', () => {
  it('round-trips correctly', () => {
    const canvasSize = 800;
    const pan = 50;
    const zoom = 2;
    const labelSize = 406;

    for (const dot of [0, 100, 203, 406]) {
      const screen = dotToScreen(dot, canvasSize, pan, zoom, labelSize);
      const back = screenToDot(screen, canvasSize, pan, zoom, labelSize);
      expect(back).toBeCloseTo(dot, 10);
    }
  });

  it('maps label origin (0) correctly', () => {
    // Canvas 800px, no pan, zoom 1, label 400 dots
    // dot 0 → 800/2 + 0 + (0 - 200)*1 = 200
    expect(dotToScreen(0, 800, 0, 1, 400)).toBe(200);
  });

  it('maps label center correctly', () => {
    // dot 200 on a 400-dot label, centered in 800px canvas → 400
    expect(dotToScreen(200, 800, 0, 1, 400)).toBe(400);
  });

  it('accounts for pan offset', () => {
    expect(dotToScreen(200, 800, 100, 1, 400)).toBe(500);
  });

  it('accounts for zoom', () => {
    // dot 200 (center) → always canvasSize/2 + pan regardless of zoom
    expect(dotToScreen(200, 800, 0, 3, 400)).toBe(400);
    // dot 0 at zoom 3 → 400 + (0-200)*3 = -200
    expect(dotToScreen(0, 800, 0, 3, 400)).toBe(-200);
  });
});

describe('computeTickInterval', () => {
  it('returns a smaller interval at higher zoom', () => {
    const lo = computeTickInterval(0.5);
    const hi = computeTickInterval(5);
    expect(hi).toBeLessThan(lo);
  });

  it('always returns a value from the nice-numbers list', () => {
    const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
    for (const zoom of [0.1, 0.5, 1, 2, 5]) {
      expect(nice).toContain(computeTickInterval(zoom));
    }
  });

  it('ensures ticks are at least minPixelSpacing apart', () => {
    const zoom = 1.5;
    const interval = computeTickInterval(zoom, 60);
    expect(interval * zoom).toBeGreaterThanOrEqual(60);
  });
});

describe('computeVisibleDotRange', () => {
  it('returns a range narrower than the full label when zoomed in', () => {
    const range = computeVisibleDotRange(800, 0, 3, 400, 24);
    expect(range.end - range.start).toBeLessThan(400);
  });

  it('returns a range wider than the label when zoomed out', () => {
    const range = computeVisibleDotRange(800, 0, 0.2, 400, 24);
    expect(range.end - range.start).toBeGreaterThan(400);
  });

  it('shifts range when panned', () => {
    const centered = computeVisibleDotRange(800, 0, 1, 400, 24);
    const panned = computeVisibleDotRange(800, 200, 1, 400, 24);
    expect(panned.start).toBeLessThan(centered.start);
    expect(panned.end).toBeLessThan(centered.end);
  });
});
