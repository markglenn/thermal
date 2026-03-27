'use client';

import type { TextProperties } from '@/lib/types';
import { getZplFontStyle } from '@/lib/constants';

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

const ROTATION_TRANSFORMS: Record<number, string> = {
  90: 'rotate(90deg) translateY(-100%)',
  180: 'rotate(180deg)',
  270: 'rotate(-90deg) translateX(-100%)',
};

export function TextElement({ props, isSelected: _isSelected }: Props) {
  const fb = props.fieldBlock;
  const rot = props.rotation;
  const fontStyle = getZplFontStyle(props.font, props.fontSize, props.fontWidth);

  const rotationTransform = ROTATION_TRANSFORMS[rot] ?? '';
  const scaleTransformParts = [
    fontStyle.scaleX !== 1 ? `scaleX(${fontStyle.scaleX})` : '',
    fontStyle.scaleY !== 1 ? `scaleY(${fontStyle.scaleY})` : '',
  ].filter(Boolean).join(' ');
  const fullTransform = [rotationTransform, scaleTransformParts].filter(Boolean).join(' ');

  const baseStyle: React.CSSProperties = {
    fontSize: fontStyle.fontSize,
    lineHeight: fb ? 1 + (fb.lineSpacing / props.fontSize) : 1,
    fontFamily: fontStyle.fontFamily,
    fontWeight: fontStyle.fontWeight,
    textTransform: fontStyle.textTransform,
    color: 'black',
    ...(fullTransform
      ? {
          transform: fullTransform,
          transformOrigin: rot === 180 ? 'center' : 'top left',
        }
      : {}),
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
