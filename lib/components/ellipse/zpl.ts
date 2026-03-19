import type { EllipseProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';

export function ellipseZpl(props: EllipseProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  const w = Math.round(bounds.width);
  const h = Math.round(bounds.height);
  const thickness = props.filled ? Math.min(w, h) : props.borderThickness;
  lines.push(`^GE${w},${h},${thickness},B^FS`);
  return lines;
}
