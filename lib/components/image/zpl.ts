import type { ImageProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';

export function imageZpl(props: ImageProperties, bounds: ResolvedBounds): string[] {
  if (!props.data || !props.zplHex) return [];

  const totalBytes = props.zplBytesPerRow * props.zplHeight;
  return [
    fieldOrigin(bounds.x, bounds.y),
    `^GFA,${totalBytes},${totalBytes},${props.zplBytesPerRow},${props.zplHex}`,
    '^FS',
  ];
}
