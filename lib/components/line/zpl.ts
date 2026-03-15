import type { LineProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';

export function lineZpl(props: LineProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  if (props.orientation === 'horizontal') {
    lines.push(`^GB${Math.round(bounds.width)},${props.thickness},${props.thickness}^FS`);
  } else {
    lines.push(`^GB${props.thickness},${Math.round(bounds.height)},${props.thickness}^FS`);
  }
  return lines;
}
