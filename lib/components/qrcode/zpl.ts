import type { QrCodeProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';
import { emitFieldData } from '@/lib/zpl/escape';

export function qrcodeCommand(props: QrCodeProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  lines.push(`^BQN,2,${props.magnification}`);
  lines.push(emitFieldData(`${props.errorCorrection}A,${props.content}`));
  return lines;
}
