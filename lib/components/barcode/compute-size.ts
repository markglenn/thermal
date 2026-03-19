import type { BarcodeProperties, BarcodeEncoding } from '@/lib/types';

const MODULE_WIDTH = 2;
const TEXT_HEIGHT = 22;

/**
 * Compute the total module count for a barcode encoding given its content length.
 */
function computeTotalModules(encoding: BarcodeEncoding, contentLength: number): number {
  switch (encoding) {
    case 'code128':
      // Code 128B: start (11) + data (11 per char) + checksum (11) + stop (13)
      return 11 * contentLength + 35;
    case 'code39':
      // Code 39: (content + 2 start/stop) * 13 modules + (content + 1) inter-char gaps
      return 13 * (contentLength + 2) + (contentLength + 1);
    case 'ean13':
      return 95;
    case 'upca':
      return 95;
    case 'itf':
      // ITF: interleaved pairs + start/stop patterns
      return 7 * contentLength + 7;
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

  const totalModules = computeTotalModules(encoding, content.length);
  const w = totalModules * MODULE_WIDTH;
  const h = height + (showText ? TEXT_HEIGHT : 0);

  if (rotation === 90 || rotation === 270) {
    return { width: h, height: w };
  }

  return { width: w, height: h };
}
