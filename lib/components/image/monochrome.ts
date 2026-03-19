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
  method: 'threshold' | 'dither'
): MonochromeResult {
  const pixels =
    method === 'dither'
      ? applyFloydSteinberg(pixelData, threshold, invert)
      : applyThreshold(pixelData, threshold, invert);

  const { hex, bytesPerRow } = pixelsToHex(pixels, pixelData.width, pixelData.height);

  return { hex, bytesPerRow, width: pixelData.width, height: pixelData.height };
}
