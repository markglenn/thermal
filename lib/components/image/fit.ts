import type { ImageObjectFit, ImageObjectPosition } from '@/lib/types';

export interface ImageLayout {
  /** Pixel dimensions to convert/render the image at */
  width: number;
  height: number;
  /** Offset within the bounding box for ZPL ^FO positioning */
  offsetX: number;
  offsetY: number;
}

/**
 * Compute the pixel dimensions of an image scaled to fit proportionally
 * inside a bounding box, capped at original size. (CSS object-fit: contain
 * but with a max-scale of 1:1.)
 */
export function containedSize(
  boxWidth: number,
  boxHeight: number,
  imageWidth: number,
  imageHeight: number,
): { width: number; height: number } {
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight, 1);
  return {
    width: Math.max(1, Math.round(imageWidth * scale)),
    height: Math.max(1, Math.round(imageHeight * scale)),
  };
}

function anchorOffset(
  boxSize: number,
  imageSize: number,
  align: 'start' | 'center' | 'end',
): number {
  if (align === 'start') return 0;
  if (align === 'end') return boxSize - imageSize;
  return Math.round((boxSize - imageSize) / 2);
}

const POSITION_MAP: Record<ImageObjectPosition, { h: 'start' | 'center' | 'end'; v: 'start' | 'center' | 'end' }> = {
  'top-left':     { h: 'start',  v: 'start' },
  'top':          { h: 'center', v: 'start' },
  'top-right':    { h: 'end',    v: 'start' },
  'left':         { h: 'start',  v: 'center' },
  'center':       { h: 'center', v: 'center' },
  'right':        { h: 'end',    v: 'center' },
  'bottom-left':  { h: 'start',  v: 'end' },
  'bottom':       { h: 'center', v: 'end' },
  'bottom-right': { h: 'end',    v: 'end' },
};

/**
 * Scale proportionally to fill the box (no cap at original size).
 */
function proportionalSize(
  boxWidth: number,
  boxHeight: number,
  imageWidth: number,
  imageHeight: number,
): { width: number; height: number } {
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  return {
    width: Math.max(1, Math.round(imageWidth * scale)),
    height: Math.max(1, Math.round(imageHeight * scale)),
  };
}

/**
 * Resolve the image's render dimensions and offset within the bounding box.
 *
 * - **fit**: scale proportionally, capped at original size. Position with anchor.
 * - **fill**: scale proportionally (may exceed original size). Position with anchor.
 * - **stretch**: distort to fill the entire bounding box. No offset.
 */
export function resolveImageLayout(
  boxWidth: number,
  boxHeight: number,
  originalWidth: number,
  originalHeight: number,
  objectFit: ImageObjectFit,
  objectPosition: ImageObjectPosition,
): ImageLayout {
  if (objectFit === 'stretch') {
    return { width: boxWidth, height: boxHeight, offsetX: 0, offsetY: 0 };
  }

  const fitted = objectFit === 'fill'
    ? proportionalSize(boxWidth, boxHeight, originalWidth, originalHeight)
    : containedSize(boxWidth, boxHeight, originalWidth, originalHeight);

  const { h, v } = POSITION_MAP[objectPosition] ?? POSITION_MAP['center'];

  return {
    width: fitted.width,
    height: fitted.height,
    offsetX: anchorOffset(boxWidth, fitted.width, h),
    offsetY: anchorOffset(boxHeight, fitted.height, v),
  };
}
