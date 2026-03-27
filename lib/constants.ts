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

// ZPL font definitions — consolidates native sizes, CSS mapping, and rendering
// parameters for each ZPL font into a single registry.
interface ZplFontDef {
  /** Native bitmap dimensions in dots (height x width). */
  nativeSize: { width: number; height: number };
  /** CSS font-family value. */
  fontFamily: string;
  /** CSS font-weight value. */
  fontWeight: number;
  /** Whether the font is freely scalable (vs bitmap with fixed native grid). */
  scalable: boolean;
  /** Multiplier for scaleX to compensate for CSS vs FreeType glyph widths. */
  widthToHeightRatio: number;
  /** Multiplier for scaleY to compensate for CSS em-square vs FreeType visible height. */
  heightScale: number;
  /** CSS text-transform value (e.g. Font B renders uppercase). */
  textTransform?: 'uppercase';
}

const FONT_SCALABLE = 'var(--font-zpl-0), Arial Narrow, sans-serif';
const FONT_BITMAP = 'var(--font-zpl-bitmap), monospace';

export const ZPL_FONTS: Record<string, ZplFontDef> = {
  '0': { nativeSize: { width: 12, height: 15 }, fontFamily: FONT_SCALABLE, fontWeight: 700, scalable: true,  widthToHeightRatio: 0.97,  heightScale: 1.0  },
  A:   { nativeSize: { width: 5,  height: 9  }, fontFamily: FONT_BITMAP,   fontWeight: 400, scalable: false, widthToHeightRatio: 2.0, heightScale: 1.25 },
  B:   { nativeSize: { width: 7,  height: 11 }, fontFamily: FONT_BITMAP,   fontWeight: 700, scalable: false, widthToHeightRatio: 2.11, heightScale: 1.25, textTransform: 'uppercase' },
  C:   { nativeSize: { width: 10, height: 18 }, fontFamily: FONT_BITMAP,   fontWeight: 400, scalable: false, widthToHeightRatio: 2.0, heightScale: 1.25 },
  D:   { nativeSize: { width: 10, height: 18 }, fontFamily: FONT_BITMAP,   fontWeight: 400, scalable: false, widthToHeightRatio: 2.0, heightScale: 1.25 },
  E:   { nativeSize: { width: 15, height: 28 }, fontFamily: FONT_BITMAP,   fontWeight: 400, scalable: false, widthToHeightRatio: 2.0, heightScale: 1.25 },
  F:   { nativeSize: { width: 13, height: 26 }, fontFamily: FONT_BITMAP,   fontWeight: 400, scalable: false, widthToHeightRatio: 2.0, heightScale: 1.25 },
  G:   { nativeSize: { width: 40, height: 60 }, fontFamily: FONT_BITMAP,   fontWeight: 400, scalable: false, widthToHeightRatio: 2.0, heightScale: 1.25 },
  H:   { nativeSize: { width: 13, height: 21 }, fontFamily: FONT_BITMAP,   fontWeight: 400, scalable: false, widthToHeightRatio: 2.0, heightScale: 1.25 },
};

const DEFAULT_FONT = ZPL_FONTS['0'];

/**
 * Compute the CSS rendering parameters for a ZPL font at a given size.
 * Handles bitmap size snapping, scaleX/scaleY compensation, and all
 * font-specific styling.
 */
export function getZplFontStyle(font: string, fontSize: number, fontWidth: number) {
  const def = ZPL_FONTS[font] ?? DEFAULT_FONT;

  // Bitmap fonts snap to multiples of their native size (matching zebrash's
  // WithAdjustedSizes). Scalable fonts use values as-is.
  let adjustedHeight = fontSize;
  let adjustedWidth = fontWidth;
  if (!def.scalable) {
    const ns = def.nativeSize;
    adjustedHeight = ns.height * Math.max(Math.round(fontSize / ns.height), 1);
    adjustedWidth = ns.width * Math.max(Math.round(fontWidth / ns.width), 1);
  }

  return {
    fontSize: adjustedHeight,
    fontFamily: def.fontFamily,
    fontWeight: def.fontWeight,
    textTransform: def.textTransform,
    scaleX: def.widthToHeightRatio * adjustedWidth / adjustedHeight,
    scaleY: def.heightScale,
  };
}

export const LABELARY_BASE_URL = 'http://api.labelary.com/v1/printers';
export const LABELARY_DEBOUNCE_MS = 300;

export function labelWidthDots(label: LabelConfig): number {
  return Math.round(label.widthInches * label.dpi);
}

export function labelHeightDots(label: LabelConfig): number {
  return Math.round(label.heightInches * label.dpi);
}
