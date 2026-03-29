/**
 * Pure monochrome conversion functions — no browser or Node dependencies.
 * Shared between client-side (Canvas) and server-side (sharp) paths.
 */

export interface PixelData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface MonochromeResult {
  hex: string;
  bytesPerRow: number;
  width: number;
  height: number;
}

export function grayscale(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function applyThreshold(
  pixelData: PixelData,
  threshold: number,
  invert: boolean
): boolean[] {
  const { data, width, height } = pixelData;
  const pixels = new Array<boolean>(width * height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const alpha = data[idx + 3];
    const gray =
      alpha < 128 ? 255 : grayscale(data[idx], data[idx + 1], data[idx + 2]);
    let isBlack = gray < threshold;
    if (invert) isBlack = !isBlack;
    pixels[i] = isBlack;
  }

  return pixels;
}

export function applyFloydSteinberg(
  pixelData: PixelData,
  threshold: number,
  invert: boolean
): boolean[] {
  const { data, width, height } = pixelData;
  const errors = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const alpha = data[idx + 3];
    errors[i] =
      alpha < 128 ? 255 : grayscale(data[idx], data[idx + 1], data[idx + 2]);
  }

  const pixels = new Array<boolean>(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const oldVal = errors[i];
      const newVal = oldVal < threshold ? 0 : 255;
      let isBlack = newVal === 0;
      if (invert) isBlack = !isBlack;
      pixels[i] = isBlack;

      const err = oldVal - newVal;
      if (x + 1 < width) errors[i + 1] += err * (7 / 16);
      if (y + 1 < height) {
        if (x - 1 >= 0) errors[i + width - 1] += err * (3 / 16);
        errors[i + width] += err * (5 / 16);
        if (x + 1 < width) errors[i + width + 1] += err * (1 / 16);
      }
    }
  }

  return pixels;
}

// 8x8 Bayer matrix normalized to 0–63, used for ordered dithering.
// Produces a regular halftone pattern that prints consistently on thermal heads.
const BAYER_8X8 = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];

export function applyOrderedDither(
  pixelData: PixelData,
  threshold: number,
  invert: boolean
): boolean[] {
  const { data, width, height } = pixelData;
  const pixels = new Array<boolean>(width * height);

  // Scale the Bayer cell size so the pattern is visible at any resolution.
  // At print resolution (~200px), cellSize=1 gives an 8px pattern.
  // At high res (2048px), cellSize scales up so the pattern stays visible.
  const cellSize = Math.max(1, Math.round(Math.max(width, height) / 256));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const idx = i * 4;
      const alpha = data[idx + 3];
      const gray = alpha < 128 ? 255 : grayscale(data[idx], data[idx + 1], data[idx + 2]);

      // Map pixel to Bayer matrix using scaled coordinates
      const bx = Math.floor(x / cellSize) & 7;
      const by = Math.floor(y / cellSize) & 7;
      const bayerNorm = (BAYER_8X8[by * 8 + bx] / 63) - 0.5;
      const adjustedThreshold = threshold + bayerNorm * 255;
      let isBlack = gray < adjustedThreshold;
      if (invert) isBlack = !isBlack;
      pixels[i] = isBlack;
    }
  }

  return pixels;
}

export function pixelsToHex(pixels: boolean[], width: number, height: number): { hex: string; bytesPerRow: number } {
  const bytesPerRow = Math.ceil(width / 8);
  let hex = '';

  for (let y = 0; y < height; y++) {
    for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = byteIdx * 8 + bit;
        if (x < width && pixels[y * width + x]) {
          byte |= 0x80 >> bit;
        }
      }
      hex += byte.toString(16).toUpperCase().padStart(2, '0');
    }
  }

  return { hex, bytesPerRow };
}

export function convertPixelsToMonochrome(
  pixelData: PixelData,
  threshold: number,
  invert: boolean,
  method: 'threshold' | 'dither' | 'ordered'
): MonochromeResult {
  const pixels =
    method === 'dither' ? applyFloydSteinberg(pixelData, threshold, invert)
    : method === 'ordered' ? applyOrderedDither(pixelData, threshold, invert)
    : applyThreshold(pixelData, threshold, invert);

  const { hex, bytesPerRow } = pixelsToHex(pixels, pixelData.width, pixelData.height);

  return { hex, bytesPerRow, width: pixelData.width, height: pixelData.height };
}
