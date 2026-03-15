import type { ImageProperties, ResolvedBounds } from '@/lib/types';
import { fieldOrigin } from '@/lib/zpl/commands';

export function imageZpl(props: ImageProperties, bounds: ResolvedBounds): string[] {
  return [fieldOrigin(bounds.x, bounds.y), '^FD[IMAGE]^FS'];
}
