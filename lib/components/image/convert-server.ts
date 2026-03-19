/**
 * Server-side image conversion using sharp.
 * Fetches an image from a URL, resizes, and converts to monochrome ZPL data.
 */

import sharp from 'sharp';
import { convertPixelsToMonochrome, type MonochromeResult } from './monochrome';

export async function convertImageUrlToMonochrome(
  url: string,
  width: number,
  height: number,
  threshold: number,
  invert: boolean,
  method: 'threshold' | 'dither'
): Promise<MonochromeResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const { data, info } = await sharp(buffer)
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return convertPixelsToMonochrome(
    { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height },
    threshold,
    invert,
    method
  );
}
