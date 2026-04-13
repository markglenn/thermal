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
  componentName?: string;
}

export function ImageElement({ props, componentName }: Props) {
  const isResizing = useEditorStoreContext((s) => s.resizeState !== null);

  if (!props.data) {
    const inverted = props.invert;
    return (
      <div
        className={`w-full h-full flex items-center justify-center text-[5cqmin] ${
          inverted ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-400'
        }`}
        style={{ containerType: 'size' }}
      >
        {componentName || 'Image'}
      </div>
    );
  }

  const src = isResizing
    ? (props.monochromePreviewFull || props.data)
    : (props.monochromePreview || props.data);

  const fit = props.objectFit ?? 'fit';
  const position = props.objectPosition ?? 'center';

  return (
    // eslint-disable-next-line @next/next/no-img-element
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
