import type { ImageProperties, ComponentLayout } from '@/lib/types';
import { MIN_RESIZE_SIZE } from '@/lib/constants';

/**
 * Enforce proportional scaling and max size limits when manually
 * changing an image component's width or height.
 */
export function constrainImageSize(
  props: ImageProperties,
  currentLayout: ComponentLayout,
  change: Partial<Pick<ComponentLayout, 'width' | 'height'>>,
): Partial<Pick<ComponentLayout, 'width' | 'height'>> {
  if (!props.originalWidth || !props.originalHeight) return change;

  const aspectRatio = props.originalWidth / props.originalHeight;

  if (change.height !== undefined) {
    const h = Math.round(Math.max(MIN_RESIZE_SIZE, Math.min(change.height, props.originalHeight)));
    const w = Math.round(Math.max(MIN_RESIZE_SIZE, Math.min(h * aspectRatio, props.originalWidth)));
    return { width: w, height: Math.round(w / aspectRatio) };
  }

  if (change.width !== undefined) {
    const w = Math.round(Math.max(MIN_RESIZE_SIZE, Math.min(change.width, props.originalWidth)));
    const h = Math.round(Math.max(MIN_RESIZE_SIZE, Math.min(w / aspectRatio, props.originalHeight)));
    return { width: Math.round(h * aspectRatio), height: h };
  }

  return change;
}
