'use client';

import type { TextProperties } from '@/lib/types';
import { ZPL_FONT_FAMILY, ZPL_FONT_WEIGHT } from '@/lib/constants';

interface Props {
  props: TextProperties;
}

export function TextElement({ props }: Props) {
  const font = props.font;
  return (
    <div
      className="whitespace-nowrap text-black"
      style={{
        fontSize: props.fontSize,
        lineHeight: 1,
        fontFamily: ZPL_FONT_FAMILY[font] || ZPL_FONT_FAMILY['0'],
        fontWeight: ZPL_FONT_WEIGHT[font] || 400,
        letterSpacing: font === '0' ? '-0.027em' : '0.05em',
        marginTop: font === '0' ? '-0.12em' : '-0.08em',
      }}
    >
      {props.content}
    </div>
  );
}
