/**
 * Client-side image conversion using browser Canvas/Image APIs.
 */

import {
  applyThreshold,
  applyFloydSteinberg,
  applyOrderedDither,
  convertPixelsToMonochrome,
  type PixelData,
} from './monochrome';

export type { MonochromeResult } from './monochrome';

function getPixelData(
  base64: string,
  width: number,
  height: number
): Promise<PixelData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };
    img.onerror = reject;
    img.src = base64;
  });
}

export async function convertImageToMonochrome(
  base64: string,
  width: number,
  height: number,
  threshold: number,
  invert: boolean,
  method: 'threshold' | 'dither' | 'ordered'
): Promise<{ hex: string; bytesPerRow: number; width: number; height: number }> {
  const imageData = await getPixelData(base64, width, height);
  return convertPixelsToMonochrome(imageData, threshold, invert, method);
}

/**
 * Generate a monochrome preview as a data URI for display purposes.
 */
function applyMethod(imageData: PixelData, threshold: number, invert: boolean, method: 'threshold' | 'dither' | 'ordered'): boolean[] {
  if (method === 'dither') return applyFloydSteinberg(imageData, threshold, invert);
  if (method === 'ordered') return applyOrderedDither(imageData, threshold, invert);
  return applyThreshold(imageData, threshold, invert);
}

export async function generateMonochromePreview(
  base64: string,
  width: number,
  height: number,
  threshold: number,
  invert: boolean,
  method: 'threshold' | 'dither' | 'ordered'
): Promise<string> {
  const imageData = await getPixelData(base64, width, height);
  const pixels = applyMethod(imageData, threshold, invert, method);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const output = ctx.createImageData(width, height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    if (pixels[i]) {
      output.data[idx] = 0;
      output.data[idx + 1] = 0;
      output.data[idx + 2] = 0;
      output.data[idx + 3] = 255;
    } else {
      output.data[idx] = 0;
      output.data[idx + 1] = 0;
      output.data[idx + 2] = 0;
      output.data[idx + 3] = 0;
    }
  }

  ctx.putImageData(output, 0, 0);
  return canvas.toDataURL('image/png');
}
