import type { DataMatrixProperties } from '@/lib/types';

/**
 * Data Matrix ECC 200 rendered sizes (square only).
 * Each entry: [maxDataBytes, renderedModules].
 * renderedModules includes the 2-module quiet zone on each side that
 * bwip-js adds, matching the actual canvas/SVG output dimensions at scale=1.
 * Derived empirically from bwip-js output to ensure preview matches.
 */
const DM_SIZES: [number, number][] = [
  [3, 20], [6, 24], [10, 28], [16, 32], [25, 36],
  [31, 40], [43, 44], [52, 48], [64, 52],
  [91, 64], [127, 72], [169, 80], [214, 88],
  [259, 96], [304, 104], [418, 120], [550, 132], [682, 144],
];

/**
 * Compute the size of a Data Matrix component purely from its properties.
 */
export function computeDataMatrixSize(props: DataMatrixProperties): { width: number; height: number } {
  const { content, moduleSize } = props;
  const contentLength = content.length || 1;

  let renderedModules = 20; // minimum (10x10 matrix + quiet zone)
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
