/** Size of the ruler strip in screen pixels. */
export const RULER_SIZE = 24;

const NICE_INTERVALS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];

/**
 * Convert a dot position on the label to a screen pixel position
 * relative to the canvas container.
 */
export function dotToScreen(
  dotPos: number,
  canvasSize: number,
  pan: number,
  zoom: number,
  labelSize: number,
): number {
  return canvasSize / 2 + pan + (dotPos - labelSize / 2) * zoom;
}

/**
 * Convert a screen pixel position (relative to canvas container)
 * to a dot position on the label.
 */
export function screenToDot(
  screenPos: number,
  canvasSize: number,
  pan: number,
  zoom: number,
  labelSize: number,
): number {
  return (screenPos - canvasSize / 2 - pan) / zoom + labelSize / 2;
}

/**
 * Pick the smallest "nice" dot interval such that adjacent ticks
 * are at least `minPixelSpacing` screen pixels apart at the given zoom.
 */
export function computeTickInterval(zoom: number, minPixelSpacing = 60): number {
  const minDotInterval = minPixelSpacing / zoom;
  for (const interval of NICE_INTERVALS) {
    if (interval >= minDotInterval) return interval;
  }
  return NICE_INTERVALS[NICE_INTERVALS.length - 1];
}

/**
 * Return the visible dot range for the given axis,
 * accounting for the ruler strip offset.
 */
export function computeVisibleDotRange(
  canvasSize: number,
  pan: number,
  zoom: number,
  labelSize: number,
  rulerSize: number,
): { start: number; end: number } {
  const start = screenToDot(rulerSize, canvasSize, pan, zoom, labelSize);
  const end = screenToDot(canvasSize, canvasSize, pan, zoom, labelSize);
  return { start, end };
}
