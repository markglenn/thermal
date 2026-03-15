import type {
  TextProperties,
  BarcodeProperties,
  QrCodeProperties,
  LineProperties,
  RectangleProperties,
  ResolvedBounds,
} from '../types';
import { getZplFontWithRotation, getZplRotation } from './fonts';

export function fieldOrigin(x: number, y: number): string {
  return `^FO${Math.round(x)},${Math.round(y)}`;
}

export function textCommand(props: TextProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  lines.push(getZplFontWithRotation(props.font, props.fontSize, props.rotation));
  lines.push(`^FD${props.content}^FS`);
  return lines;
}

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

export function qrcodeCommand(props: QrCodeProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  lines.push(`^BQN,2,${props.magnification}`);
  lines.push(`^FD${props.errorCorrection}A,${props.content}^FS`);
  return lines;
}

export function lineCommand(props: LineProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  if (props.orientation === 'horizontal') {
    lines.push(`^GB${Math.round(bounds.width)},${props.thickness},${props.thickness}^FS`);
  } else {
    lines.push(`^GB${props.thickness},${Math.round(bounds.height)},${props.thickness}^FS`);
  }
  return lines;
}

export function rectangleCommand(props: RectangleProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  const w = Math.round(bounds.width);
  const h = Math.round(bounds.height);
  const thickness = props.filled ? Math.min(w, h) : props.borderThickness;
  lines.push(`^GB${w},${h},${thickness},B,${props.cornerRadius}^FS`);
  return lines;
}
