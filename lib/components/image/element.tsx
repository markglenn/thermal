'use client';

import type { ImageProperties } from '@/lib/types';

interface Props {
  props: ImageProperties;
  isSelected: boolean;
}

export function ImageElement({ props }: Props) {
  return (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
      Image
    </div>
  );
}
