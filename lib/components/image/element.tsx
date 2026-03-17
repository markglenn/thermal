'use client';

import type { ImageProperties } from '@/lib/types';
import { useEditorStoreContext } from '@/lib/store/editor-context';

interface Props {
  props: ImageProperties;
  isSelected: boolean;
}

export function ImageElement({ props }: Props) {
  const isResizing = useEditorStoreContext((s) => s.resizeState !== null);

  if (!props.data) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
        Image
      </div>
    );
  }

  // During resize: show full-res monochrome, let CSS scale it smoothly
  // When idle: show monochrome rendered at constraint dimensions for accurate dithering
  const src = isResizing
    ? (props.monochromePreviewFull || props.data)
    : (props.monochromePreview || props.data);

  return (
    <img
      src={src}
      alt=""
      className="w-full h-full object-fill"
      draggable={false}
    />
  );
}
