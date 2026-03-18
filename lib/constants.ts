import type { LabelConfig } from './types';

export const DPI_VALUES = [203, 300, 600] as const;

export const DEFAULT_LABEL: LabelConfig = {
  widthInches: 2,
  heightInches: 1,
  dpi: 203,
};

export const DEFAULT_ZOOM = 1;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 0.1;

export const GRID_SIZE = 8; // dots

// ZPL ^FO coordinate range (0–32000 per spec)
export const ZPL_COORD_MIN = 0;
export const ZPL_COORD_MAX = 32000;

/** Clamp and round a coordinate to the valid ZPL range (0–32000). */
export function clampCoord(v: number): number {
  return Math.max(ZPL_COORD_MIN, Math.min(ZPL_COORD_MAX, Math.round(v)));
}

// Constraint resolver fallbacks (dots) when width/height aren't specified
export const FALLBACK_WIDTH = 100;
export const FALLBACK_HEIGHT = 40;

// Minimum size during resize (dots)
export const MIN_RESIZE_SIZE = 10;

// Duplicate component offset (dots)
export const DUPLICATE_OFFSET = 20;

// Canvas viewport
export const FIT_PADDING = 40; // px padding around label when fitting to screen
export const PAN_CLAMP_MARGIN = 15; // px margin to keep label edge visible
export const ZOOM_SENSITIVITY = 0.005; // wheel delta multiplier for zoom

// Undo throttle — collapses rapid state changes into one history entry
export const UNDO_THROTTLE_MS = 500;

export const LABEL_PRESETS: Record<string, LabelConfig> = {
  '4x6': { widthInches: 4, heightInches: 6, dpi: 203 },
  '4x4': { widthInches: 4, heightInches: 4, dpi: 203 },
  '2x1': { widthInches: 2, heightInches: 1, dpi: 203 },
  '3x2': { widthInches: 3, heightInches: 2, dpi: 203 },
};

// ZPL font size mapping (native bitmap dimensions in dots: height x width)
export const ZPL_FONT_SIZES: Record<string, { width: number; height: number }> = {
  A: { width: 5, height: 9 },
  B: { width: 7, height: 11 },
  C: { width: 10, height: 18 },
  D: { width: 10, height: 18 },
  E: { width: 15, height: 28 },
  F: { width: 13, height: 26 },
  G: { width: 40, height: 60 },
  H: { width: 13, height: 21 },
  '0': { width: 12, height: 15 },
};

// CSS font-family mapping: ZPL font letter → closest screen substitute
export const ZPL_FONT_FAMILY: Record<string, string> = {
  '0': 'var(--font-zpl-0), Arial Narrow, sans-serif',
  A: 'var(--font-zpl-bitmap), monospace',
  B: 'var(--font-zpl-bitmap), monospace',
  C: 'var(--font-zpl-bitmap), monospace',
  D: 'var(--font-zpl-bitmap), monospace',
  E: 'var(--font-zpl-bitmap), monospace',
  F: 'var(--font-zpl-bitmap), monospace',
  G: 'var(--font-zpl-bitmap), monospace',
  H: 'var(--font-zpl-bitmap), monospace',
};

// Font weight mapping
export const ZPL_FONT_WEIGHT: Record<string, number> = {
  '0': 700,
  A: 700, B: 700, C: 700, D: 700, E: 700, F: 700, G: 700, H: 700,
};

export const LABELARY_BASE_URL = 'http://api.labelary.com/v1/printers';
export const LABELARY_DEBOUNCE_MS = 300;

export function labelWidthDots(label: LabelConfig): number {
  return Math.round(label.widthInches * label.dpi);
}

export function labelHeightDots(label: LabelConfig): number {
  return Math.round(label.heightInches * label.dpi);
}
