import type { DataMatrixProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';

export function datamatrixZpl(props: DataMatrixProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  // ^BXN,rowHeight,qualityLevel — quality 200 = ECC 200 (standard)
  lines.push(`^BXN,${props.moduleSize},200`);
  lines.push(`^FD${props.content}^FS`);
  return lines;
}
