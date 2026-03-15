import type { LabelConfig, Constraints, ComponentType, TextProperties, BarcodeProperties, QrCodeProperties, LineProperties, RectangleProperties } from './types';

export const DPI_VALUES = [203, 300, 600] as const;

export const DEFAULT_LABEL: LabelConfig = {
  widthInches: 4,
  heightInches: 6,
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
  text: { left: 0, top: 0, width: 200, height: 40 },
  barcode: { left: 0, top: 0, width: 300, height: 80 },
  qrcode: { left: 0, top: 0, width: 100, height: 100 },
  image: { left: 0, top: 0, width: 200, height: 200 },
  line: { left: 0, top: 0, width: 200, height: 2 },
  rectangle: { left: 0, top: 0, width: 150, height: 100 },
  container: { left: 0, top: 0, width: 300, height: 200 },
};

export const DEFAULT_TEXT_PROPS: TextProperties = {
  content: 'Label Text',
  font: '0',
  fontSize: 30,
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

// ZPL font size mapping (approximate pixel heights for ZPL fonts)
export const ZPL_FONT_SIZES: Record<string, { width: number; height: number }> = {
  A: { width: 9, height: 5 },
  B: { width: 11, height: 7 },
  C: { width: 18, height: 10 },
  D: { width: 18, height: 10 },
  E: { width: 28, height: 15 },
  F: { width: 26, height: 13 },
  G: { width: 60, height: 40 },
  H: { width: 21, height: 13 },
  '0': { width: 15, height: 12 }, // Default scalable font
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
