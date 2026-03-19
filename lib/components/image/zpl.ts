import type { ImageProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';
import { resolveImageLayout } from './fit';

export function imageZpl(props: ImageProperties, bounds: ResolvedBounds): string[] {
  if (!props.data || !props.zplHex) return [];

  const layout = resolveImageLayout(
    bounds.width, bounds.height,
    props.originalWidth, props.originalHeight,
    props.objectFit, props.objectPosition,
  );

  const totalBytes = props.zplBytesPerRow * props.zplHeight;
  return [
    fieldOrigin(bounds.x + layout.offsetX, bounds.y + layout.offsetY),
    `^GFA,${totalBytes},${totalBytes},${props.zplBytesPerRow},${props.zplHex}`,
    '^FS',
  ];
}
