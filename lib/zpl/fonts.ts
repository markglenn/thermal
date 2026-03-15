import type { ZplFont } from '../types';

// Maps our font identifiers to ZPL font letters
export function getZplFontCommand(font: ZplFont, fontSize: number): string {
  // ^A<font>,<height>,<width>
  // For font '0' (scalable), height and width can be set freely
  return `^A${font}N,${fontSize},${fontSize}`;
}

// Rotation field values for ZPL
export function getZplRotation(rotation: number): string {
  switch (rotation) {
    case 90: return 'R';
    case 180: return 'I';
    case 270: return 'B';
    default: return 'N';
  }
}

export function getZplFontWithRotation(font: ZplFont, fontSize: number, rotation: number): string {
  const rot = getZplRotation(rotation);
  return `^A${font}${rot},${fontSize},${fontSize}`;
}
