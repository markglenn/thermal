import type { LabelConfig, Constraints, ComponentType, TextProperties, BarcodeProperties, QrCodeProperties, LineProperties, RectangleProperties } from './types';

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

export const LABEL_PRESETS: Record<string, LabelConfig> = {
  '4x6': { widthInches: 4, heightInches: 6, dpi: 203 },
  '4x4': { widthInches: 4, heightInches: 4, dpi: 203 },
  '2x1': { widthInches: 2, heightInches: 1, dpi: 203 },
  '3x2': { widthInches: 3, heightInches: 2, dpi: 203 },
};

// Default constraints when dropping new components
export const DEFAULT_COMPONENT_CONSTRAINTS: Record<ComponentType, Constraints> = {
  text: { left: 0, top: 0 },
  barcode: { left: 0, top: 0 },
  qrcode: { left: 0, top: 0 },
  image: { left: 0, top: 0, width: 200, height: 200 },
  line: { left: 0, top: 0, width: 200, height: 2 },
  rectangle: { left: 0, top: 0, width: 150, height: 100 },
  container: { left: 0, top: 0, width: 300, height: 200 },
};

export const DEFAULT_TEXT_PROPS: TextProperties = {
  content: 'Label Text',
  font: '0',
  fontSize: 30,
  fontWidth: 30,
  rotation: 0,
};

export const DEFAULT_BARCODE_PROPS: BarcodeProperties = {
  content: '1234567890',
  encoding: 'code128',
  height: 80,
  showText: true,
  rotation: 0,
};

export const DEFAULT_QRCODE_PROPS: QrCodeProperties = {
  content: 'https://example.com',
  magnification: 5,
  errorCorrection: 'Q',
};

export const DEFAULT_LINE_PROPS: LineProperties = {
  thickness: 2,
  orientation: 'horizontal',
};

export const DEFAULT_RECTANGLE_PROPS: RectangleProperties = {
  borderThickness: 2,
  cornerRadius: 0,
  filled: false,
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
  '0': { width: 12, height: 15 }, // Default scalable font
};

// CSS font-family mapping: ZPL font letter → closest screen substitute
// Font 0: CG Triumvirate Bold Condensed → Roboto Condensed Bold (proportional condensed)
// Fonts A-H: proprietary bitmaps → Source Code Pro (monospace)
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

// Font weight mapping — Font 0 is bold condensed, bitmaps render at regular weight
export const ZPL_FONT_WEIGHT: Record<string, number> = {
  '0': 700,
  A: 400, B: 400, C: 400, D: 400, E: 400, F: 400, G: 400, H: 400,
};

export const LABELARY_BASE_URL = 'http://api.labelary.com/v1/printers';
export const LABELARY_DEBOUNCE_MS = 300;

// Helper to convert label dimensions to dots
export function labelWidthDots(label: LabelConfig): number {
  return Math.round(label.widthInches * label.dpi);
}

export function labelHeightDots(label: LabelConfig): number {
  return Math.round(label.heightInches * label.dpi);
}

// Estimate text bounds in dots based on ZPL font metrics.
// For font 0 (scalable): fontSize sets the height, width ≈ 60% of height (condensed).
// For bitmap fonts A-H: fontSize is ignored, native cell size is used.
export function estimateTextBounds(props: TextProperties): { width: number; height: number } {
  const { font, fontSize, fontWidth, content } = props;
  const len = content.length;

  if (font === '0') {
    const charWidth = Math.round(fontWidth * 0.6);
    return { width: charWidth * len, height: fontSize };
  }

  const size = ZPL_FONT_SIZES[font];
  if (size) {
    return { width: size.width * len, height: size.height };
  }

  return { width: fontWidth * 0.6 * len, height: fontSize };
}
