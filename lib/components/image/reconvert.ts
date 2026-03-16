import type { ImageProperties } from '@/lib/types';
import { convertImageToMonochrome, generateMonochromePreview } from './convert';
import { useEditorStore } from '@/lib/store/editor-store';
import { findComponent } from '@/lib/utils';

/**
 * Re-run monochrome conversion for an image component at its current constraint dimensions.
 * Called after resize ends so both ZPL hex and canvas preview match the target size.
 */
export async function reconvertImageAtBounds(componentId: string) {
  const state = useEditorStore.getState();
  const comp = findComponent(state.document.components, componentId);
  if (!comp || comp.typeData.type !== 'image') return;

  const props = comp.typeData.props as ImageProperties;
  if (!props.data) return;

  // Use constraint dimensions as target size
  const targetWidth = comp.constraints.width ?? props.originalWidth;
  const targetHeight = comp.constraints.height ?? props.originalHeight;

  // Skip if dimensions haven't changed from what's already computed
  if (targetWidth === props.zplWidth && targetHeight === props.zplHeight) return;

  const [result, preview] = await Promise.all([
    convertImageToMonochrome(
      props.data,
      targetWidth,
      targetHeight,
      props.threshold,
      props.invert,
      props.monochromeMethod
    ),
    generateMonochromePreview(
      props.data,
      targetWidth,
      targetHeight,
      props.threshold,
      props.invert,
      props.monochromeMethod
    ),
  ]);

  useEditorStore.getState().updateProperties(componentId, {
    monochromePreview: preview,
    zplHex: result.hex,
    zplBytesPerRow: result.bytesPerRow,
    zplWidth: result.width,
    zplHeight: result.height,
  });
}
