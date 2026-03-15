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

  const rot = props.rotation;

  // ZPL rotation: ^FO marks the starting corner of the content flow.
  // Use percentage-based translates so they work regardless of element size.
  const ROTATION_TRANSFORMS: Record<number, string> = {
    90: 'rotate(90deg) translateY(-100%)',
    180: 'rotate(180deg)',
    270: 'rotate(-90deg) translateX(-100%)',
  };
  const rotationTransform = ROTATION_TRANSFORMS[rot] ?? '';
  const scaleTransform = scaleX !== 1 ? ` scaleX(${scaleX})` : '';
  const fullTransform = rotationTransform + scaleTransform;

  const baseStyle: React.CSSProperties = {
    fontSize: props.fontSize,
    lineHeight: fb ? 1 + (fb.lineSpacing / props.fontSize) : 1,
    fontFamily: ZPL_FONT_FAMILY[font] || ZPL_FONT_FAMILY['0'],
    fontWeight: ZPL_FONT_WEIGHT[font] || 400,
    letterSpacing: isScalable ? '-0.027em' : '0.05em',
    marginTop: rot === 0 ? '-0.12em' : 0,
    color: 'black',
    ...(fullTransform
      ? {
          transform: fullTransform,
          transformOrigin: rot === 180 ? 'center' : 'top left',
        }
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
