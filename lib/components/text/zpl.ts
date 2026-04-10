import type { TextProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';
import { getZplFontWithRotation } from '@/lib/zpl/fonts';

export function generateTextZpl(props: TextProperties, bounds: ResolvedBounds): string[] {
  const lines: string[] = [];
  let y = bounds.y;

  if (props.fieldBlock) {
    const fb = props.fieldBlock;
    const va = fb.verticalAlign;

    // For vertical alignment, offset Y so the text block is centered/bottom
    // within the fixed-height box. Estimate content height from maxLines.
    if (va === 'center' || va === 'bottom') {
      const lineHeight = props.fontSize + fb.lineSpacing;
      const contentHeight = fb.maxLines * lineHeight;
      const gap = bounds.height - contentHeight;
      if (gap > 0) {
        y += va === 'center' ? Math.round(gap / 2) : gap;
      }
    }
  }

  lines.push(fieldOrigin(bounds.x, y));
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
