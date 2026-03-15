'use client';

import type { RectangleProperties } from '@/lib/types';

interface Props {
  props: RectangleProperties;
  isSelected: boolean;
}

export function RectangleElement({ props }: Props) {
  return (
    <div
      className="w-full h-full"
      style={{
        border: props.filled
          ? 'none'
          : `${props.borderThickness}px solid black`,
        backgroundColor: props.filled ? 'black' : 'transparent',
        borderRadius: props.cornerRadius,
      }}
    />
  );
}
