import type { BarcodeProperties, BarcodeEncoding } from '@/lib/types';

const MODULE_WIDTH = 2;
const TEXT_HEIGHT = 22;

/**
 * Compute the total module count for a barcode encoding given its content length.
 * When showText is true, JsBarcode adds extra padding modules for the human-readable
 * digits that sit outside the guard bars (EAN-13 leading digit, UPC-A first/last digits).
 */
function computeTotalModules(encoding: BarcodeEncoding, contentLength: number, showText: boolean): number {
  switch (encoding) {
    case 'code128':
      // Code 128B: start (11) + data (11 per char) + checksum (11) + stop (13)
      return 11 * contentLength + 35;
    case 'code39':
      // Code 39: start * (16) + data chars (15 + 1 inter-char gap each) + stop * (16)
      return 16 * (contentLength + 2);
    case 'ean13':
      // 95 bar modules + 12 leading digit padding when text is shown
      return 95 + (showText ? 12 : 0);
    case 'upca':
      // 95 bar modules + 8 first digit + 8 last digit padding when text is shown
      return 95 + (showText ? 16 : 0);
    case 'itf':
      // ITF: start (4) + pairs (18 modules each, contentLength/2 pairs) + end (5)
      return 9 * contentLength + 9;
  }
}

/**
 * Compute the size of a barcode component purely from its properties.
 * No DOM measurement — deterministic from props alone.
 */
export function computeBarcodeSize(props: BarcodeProperties): { width: number; height: number } {
  const { content, encoding, height, showText, rotation } = props;

  if (content.length === 0) {
    return { width: 0, height: height + (showText ? TEXT_HEIGHT : 0) };
  }

  const totalModules = computeTotalModules(encoding, content.length, showText);
  const w = totalModules * MODULE_WIDTH;
  const h = height + (showText ? TEXT_HEIGHT : 0);

  if (rotation === 90 || rotation === 270) {
    return { width: h, height: w };
  }

  return { width: w, height: h };
}
