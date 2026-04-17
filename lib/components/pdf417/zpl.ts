import type { Pdf417Properties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';
import { emitFieldData } from '@/lib/zpl/escape';

export function pdf417Zpl(props: Pdf417Properties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  // ^B7N,rowHeight,securityLevel,columns,rows(auto),truncate(no)
  lines.push(`^B7N,${props.rowHeight},${props.securityLevel},${props.columns},0,N`);
  lines.push(emitFieldData(props.content));
  return lines;
}
