'use client';

import type { EllipseProperties } from '@/lib/types';

interface Props {
  props: EllipseProperties;
  isSelected: boolean;
}

export function EllipseElement({ props }: Props) {
  return (
    <div
      className="w-full h-full"
      style={{
        border: props.filled
          ? 'none'
          : `${props.borderThickness}px solid black`,
        backgroundColor: props.filled ? 'black' : 'transparent',
        borderRadius: '50%',
      }}
    />
  );
}
