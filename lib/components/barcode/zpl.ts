import type { BarcodeProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';
import { getZplRotation } from '@/lib/zpl/fonts';

export function barcodeCommand(props: BarcodeProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));

  const rot = getZplRotation(props.rotation);
  const showText = props.showText ? 'Y' : 'N';

  switch (props.encoding) {
    case 'code128':
      lines.push(`^BC${rot},${props.height},${showText},N`);
      break;
    case 'code39':
      lines.push(`^B3${rot},N,${props.height},${showText},N`);
      break;
    case 'ean13':
      lines.push(`^BE${rot},${props.height},${showText},N`);
      break;
    case 'upca':
      lines.push(`^BU${rot},${props.height},${showText},N`);
      break;
    case 'itf':
      lines.push(`^B2${rot},${props.height},${showText},N`);
      break;
  }

  lines.push(`^FD${props.content}^FS`);
  return lines;
}
