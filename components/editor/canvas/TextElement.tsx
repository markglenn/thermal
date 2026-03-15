'use client';

import type { TextProperties } from '@/lib/types';
import { ZPL_FONT_FAMILY, ZPL_FONT_WEIGHT, ZPL_FONT_SIZES } from '@/lib/constants';

interface Props {
  props: TextProperties;
  isSelected?: boolean;
}

const JUSTIFICATION_MAP: Record<string, React.CSSProperties['textAlign']> = {
  L: 'left',
  C: 'center',
  R: 'right',
  J: 'justify',
};

export function TextElement({ props, isSelected }: Props) {
  const font = props.font;
  const fb = props.fieldBlock;
  const isScalable = font === '0';

  // For font 0 (scalable): fontSize = height, fontWidth = width, scaleX adjusts proportionally
  // For bitmap fonts A-H: fontSize/fontWidth define the character cell size,
  //   but the font renders at its native aspect ratio, so we compute scaleX
  //   from the requested cell size vs the font's natural proportions
  let scaleX = 1;
  if (isScalable) {
    scaleX = props.fontWidth / props.fontSize;
  } else {
    const nativeSize = ZPL_FONT_SIZES[font];
    if (nativeSize) {
      // Natural aspect ratio: nativeWidth / nativeHeight
      // Requested aspect ratio: fontWidth / fontSize
      const naturalRatio = nativeSize.width / nativeSize.height;
      const requestedRatio = props.fontWidth / props.fontSize;
      scaleX = requestedRatio / naturalRatio;
    }
  }

  // Build transform: ZPL rotation positions the field origin at the start of text flow.
  // R (90° CW): text flows downward, origin = top-left of vertical text
  // I (180°): text flows leftward, origin = top-left (becomes bottom-right of flipped text)
  // B (270° CW): text flows upward, origin = bottom-left of vertical text
  // CSS rotate pivots around transform-origin, so we translate to compensate.
  const transforms: string[] = [];
  const rot = props.rotation;

  // Translate to keep the visual origin at the CSS position
  // After rotate(90deg) with origin top-left, text swings left → translate right by fontSize
  // After rotate(180deg), text swings up-left → translate right by width, down by height
  // After rotate(270deg), text swings down → translate down... but ZPL 270 goes up
  if (rot === 90) {
    transforms.push(`translateX(${props.fontSize}px)`);
    transforms.push('rotate(90deg)');
  } else if (rot === 180) {
    transforms.push('rotate(180deg)');
  } else if (rot === 270) {
    transforms.push(`translateY(${props.fontSize}px)`);
    transforms.push('rotate(270deg)');
  }

  if (scaleX !== 1) {
    transforms.push(`scaleX(${scaleX})`);
  }

  const baseStyle: React.CSSProperties = {
    fontSize: props.fontSize,
    lineHeight: fb ? 1 + (fb.lineSpacing / props.fontSize) : 1,
    fontFamily: ZPL_FONT_FAMILY[font] || ZPL_FONT_FAMILY['0'],
    fontWeight: ZPL_FONT_WEIGHT[font] || 400,
    letterSpacing: isScalable ? '-0.027em' : '0.05em',
    marginTop: rot === 0 ? '-0.12em' : 0,
    color: 'black',
    ...(transforms.length > 0
      ? { transform: transforms.join(' '), transformOrigin: 'left top' }
      : {}),
    ...(isSelected ? { outline: '2px solid #3b82f6' } : {}),
  };

  if (fb) {
    return (
      <div
        style={{
          ...baseStyle,
          textAlign: JUSTIFICATION_MAP[fb.justification] || 'left',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          overflow: 'hidden',
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

  return (
    <div className="whitespace-nowrap" style={baseStyle}>
      {props.content}
    </div>
  );
}
