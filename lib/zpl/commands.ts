import { clampCoord } from '../constants';

/** Shared ZPL field origin command used by all component ZPL generators */
export function fieldOrigin(x: number, y: number): string {
  return `^FO${clampCoord(x)},${clampCoord(y)}`;
}
