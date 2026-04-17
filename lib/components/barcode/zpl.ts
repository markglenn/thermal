import type { BarcodeProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';
import { emitFieldData } from '@/lib/zpl/escape';
import { getZplRotation } from '@/lib/zpl/fonts';
import { computeTotalModules, deriveFitModuleWidth } from './compute-size';

export function barcodeCommand(props: BarcodeProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];

  let mw: number;
  let height: number;
  let originX = bounds.x;
  let originY = bounds.y;

  if (props.sizingMode === 'fit') {
    const rotated = props.rotation === 90 || props.rotation === 270;
    const barAxisLength = rotated ? bounds.height : bounds.width;
    const heightAxisLength = rotated ? bounds.width : bounds.height;
    const total = computeTotalModules(props.encoding, props.content.length, props.showText);
    mw = Math.max(1, deriveFitModuleWidth(barAxisLength, total));
    const textHeight = props.showText ? 10 * mw + 2 : 0;
    height = Math.max(1, heightAxisLength - textHeight);

    const renderedBarAxis = mw * total;
    const slack = Math.max(0, barAxisLength - renderedBarAxis);
    const align = props.alignment ?? 'left';
    const offset = align === 'center' ? Math.floor(slack / 2) : align === 'right' ? slack : 0;
    if (rotated) originY += offset;
    else originX += offset;
  } else {
    mw = props.moduleWidth ?? 2;
    height = props.height;
  }

  lines.push(fieldOrigin(originX, originY));

  lines.push(`^BY${mw}`);

  const rot = getZplRotation(props.rotation);
  const showText = props.showText ? 'Y' : 'N';

  switch (props.encoding) {
    case 'code128':
      lines.push(`^BC${rot},${height},${showText},N`);
      break;
    case 'code39':
      lines.push(`^B3${rot},N,${height},${showText},N`);
      break;
    case 'ean13':
      lines.push(`^BE${rot},${height},${showText},N`);
      break;
    case 'upca':
      lines.push(`^BU${rot},${height},${showText},N`);
      break;
    case 'itf':
      lines.push(`^B2${rot},${height},${showText},N`);
      break;
  }

  lines.push(emitFieldData(props.content));
  return lines;
}
