'use client';

import type { TextProperties } from '@/lib/types';
import { ZPL_FONT_FAMILY, ZPL_FONT_WEIGHT } from '@/lib/constants';

interface Props {
  props: TextProperties;
}

const JUSTIFICATION_MAP: Record<string, React.CSSProperties['textAlign']> = {
  L: 'left',
  C: 'center',
  R: 'right',
  J: 'justify',
};

export function TextElement({ props }: Props) {
  const font = props.font;
  const scaleX = props.fontWidth / props.fontSize;
  const fb = props.fieldBlock;

  const baseStyle: React.CSSProperties = {
    fontSize: props.fontSize,
    lineHeight: fb ? 1 + (fb.lineSpacing / props.fontSize) : 1,
    fontFamily: ZPL_FONT_FAMILY[font] || ZPL_FONT_FAMILY['0'],
    fontWeight: ZPL_FONT_WEIGHT[font] || 400,
    letterSpacing: '-0.027em',
    marginTop: '-0.12em',
    color: 'black',
  };

  // Apply horizontal scaling if width differs from height
  if (scaleX !== 1) {
    baseStyle.transform = `scaleX(${scaleX})`;
    baseStyle.transformOrigin = 'left top';
  }

  if (fb) {
    // Field block mode: fixed width, word wrap, justification
    return (
      <div
        style={{
          ...baseStyle,
          // Divide by scaleX so the visual width matches after transform
          width: scaleX !== 1 ? fb.width / scaleX : fb.width,
          textAlign: JUSTIFICATION_MAP[fb.justification] || 'left',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          overflow: 'hidden',
          // Limit lines via line-clamp
          ...(fb.maxLines > 0
            ? {
                display: '-webkit-box',
                WebkitLineClamp: fb.maxLines,
                WebkitBoxOrient: 'vertical' as const,
              }
            : {}),
        }}
      >
        {props.content}
      </div>
    );
  }

  // Single-line mode (no field block)
  return (
    <div className="whitespace-nowrap" style={baseStyle}>
      {props.content}
    </div>
  );
}
