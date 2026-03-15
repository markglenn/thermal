import type { TextProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';
import { getZplFontWithRotation } from '@/lib/zpl/fonts';

export function generateTextZpl(props: TextProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  lines.push(fieldOrigin(bounds.x, bounds.y));
  lines.push(getZplFontWithRotation(props.font, props.fontSize, props.fontWidth, props.rotation));
  if (props.fieldBlock) {
    const fb = props.fieldBlock;
    lines.push(`^FB${Math.round(bounds.width)},${fb.maxLines},${fb.lineSpacing},${fb.justification},0`);
  }
  const content = props.fieldBlock
    ? props.content.replace(/\n/g, '\\&')
    : props.content;
  lines.push(`^FD${content}^FS`);
  return lines;
}
