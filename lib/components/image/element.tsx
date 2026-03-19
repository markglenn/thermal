'use client';

import type { ImageProperties, ImageObjectPosition } from '@/lib/types';
import { useEditorStoreContext } from '@/lib/store/editor-context';

const CSS_OBJECT_POSITION: Record<ImageObjectPosition, string> = {
  'top-left': 'left top',
  'top': 'center top',
  'top-right': 'right top',
  'left': 'left center',
  'center': 'center center',
  'right': 'right center',
  'bottom-left': 'left bottom',
  'bottom': 'center bottom',
  'bottom-right': 'right bottom',
};

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

  const src = isResizing
    ? (props.monochromePreviewFull || props.data)
    : (props.monochromePreview || props.data);

  const fit = props.objectFit ?? 'fit';
  const position = props.objectPosition ?? 'center';

  return (
    <img
      src={src}
      alt=""
      className="w-full h-full"
      style={{
        objectFit: fit === 'stretch' ? 'fill' : fit === 'fill' ? 'contain' : 'scale-down',
        objectPosition: CSS_OBJECT_POSITION[position],
      }}
      draggable={false}
    />
  );
}
