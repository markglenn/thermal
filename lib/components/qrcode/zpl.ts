import type { QrCodeProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';

export function qrcodeCommand(props: QrCodeProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  lines.push(`^BQN,2,${props.magnification}`);
  lines.push(`^FD${props.errorCorrection}A,${props.content}^FS`);
  return lines;
}
