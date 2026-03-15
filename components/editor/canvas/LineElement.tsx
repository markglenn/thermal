'use client';

import type { LineProperties } from '@/lib/types';

interface Props {
  props: LineProperties;
}

export function LineElement({ props }: Props) {
  const isHorizontal = props.orientation === 'horizontal';
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="bg-black"
        style={{
          width: isHorizontal ? '100%' : props.thickness,
          height: isHorizontal ? props.thickness : '100%',
        }}
      />
    </div>
  );
}
