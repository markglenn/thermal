import type { DataMatrixProperties } from '@/lib/types';

/**
 * Data Matrix ECC 200 symbol sizes (square only).
 * Each entry: [maxDataCodewords, symbolModules].
 * symbolModules is the symbol size without quiet zone, matching ZPL ^BX output.
 * Verified against Labelary API output.
 *
 * Note: ZPL uses numeric encoding for digit strings (2 digits per codeword),
 * so contentLength is halved for all-digit content before lookup.
 * Reference: ISO/IEC 16022 Table 7.
 */
const DM_SIZES: [number, number][] = [
  [3, 10], [6, 12], [10, 14], [16, 16], [20, 18],
  [31, 20], [41, 22], [52, 24], [64, 26],
  [91, 32], [127, 36], [169, 40], [214, 44],
  [259, 48], [304, 52], [418, 64], [550, 72],
  [682, 80], [862, 88], [1042, 96], [1222, 104],
  [1573, 120], [1954, 132], [2335, 144],
];

/**
 * Estimate data codewords for a string using Data Matrix encoding rules.
 * Consecutive digit pairs are packed (1 codeword per 2 digits). A mode-switch
 * codeword is added when transitioning between digit runs and other characters.
 */
export function estimateCodewords(content: string): number {
  let codewords = 0;
  let inDigitMode = false;
  let i = 0;
  while (i < content.length) {
    const isDigit = content[i] >= '0' && content[i] <= '9';
    const nextIsDigit = i + 1 < content.length && content[i + 1] >= '0' && content[i + 1] <= '9';

    if (isDigit && nextIsDigit) {
      if (!inDigitMode) inDigitMode = true;
      codewords++;
      i += 2;
    } else {
      if (inDigitMode) {
        // Unlatch from digit mode costs 1 codeword
        codewords++;
        inDigitMode = false;
      }
      codewords++;
      i++;
    }
  }
  return codewords;
}

/**
 * Compute the size of a Data Matrix component purely from its properties.
 */
export function computeDataMatrixSize(props: DataMatrixProperties): { width: number; height: number } {
  const { content, moduleSize } = props;
  const contentLength = estimateCodewords(content) || 1;

  let renderedModules = 10; // minimum (10x10 symbol)
  for (const [capacity, size] of DM_SIZES) {
    if (capacity >= contentLength) {
      renderedModules = size;
      break;
    }
  }
  // If content exceeds all capacities, use largest
  if (contentLength > DM_SIZES[DM_SIZES.length - 1][0]) {
    renderedModules = DM_SIZES[DM_SIZES.length - 1][1];
  }

  const pixels = renderedModules * moduleSize;
  return { width: pixels, height: pixels };
}
