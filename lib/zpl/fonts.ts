import type { ZplFont } from '../types';

// Rotation field values for ZPL
export function getZplRotation(rotation: number): string {
  switch (rotation) {
    case 90: return 'R';
    case 180: return 'I';
    case 270: return 'B';
    default: return 'N';
  }
}

// ^A<font><rotation>,<height>,<width>
export function getZplFontWithRotation(font: ZplFont, height: number, width: number, rotation: number): string {
  const rot = getZplRotation(rotation);
  return `^A${font}${rot},${height},${width}`;
}
