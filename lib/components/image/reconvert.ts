import type { ImageProperties } from '@/lib/types';
import type { EditorStoreApi } from '@/lib/store/editor-store';
import { convertImageToMonochrome, generateMonochromePreview } from './convert';
import { resolveImageLayout } from './fit';
import { findComponent } from '@/lib/utils';

/**
 * Re-run monochrome conversion for an image component at its current render
 * dimensions (based on objectFit mode and bounding box).
 * Called after resize ends so both ZPL hex and canvas preview match the target size.
 */
export async function reconvertImageAtBounds(componentId: string, storeApi: EditorStoreApi) {
  const state = storeApi.getState();
  const comp = findComponent(state.document.components, componentId);
  if (!comp || comp.typeData.type !== 'image') return;

  const props = comp.typeData.props as ImageProperties;
  if (!props.data) return;

  const boxWidth = comp.layout.width ?? props.originalWidth;
  const boxHeight = comp.layout.height ?? props.originalHeight;
  const layout = resolveImageLayout(
    boxWidth, boxHeight,
    props.originalWidth, props.originalHeight,
    props.objectFit, props.objectPosition,
  );

  // Skip if dimensions haven't changed from what's already computed
  if (layout.width === props.zplWidth && layout.height === props.zplHeight) return;

  const [result, preview] = await Promise.all([
    convertImageToMonochrome(
      props.data,
      layout.width,
      layout.height,
      props.threshold,
      props.invert,
      props.monochromeMethod
    ),
    generateMonochromePreview(
      props.data,
      layout.width,
      layout.height,
      props.threshold,
      props.invert,
      props.monochromeMethod
    ),
  ]);

  storeApi.getState().updateProperties(componentId, {
    monochromePreview: preview,
    zplHex: result.hex,
    zplBytesPerRow: result.bytesPerRow,
    zplWidth: result.width,
    zplHeight: result.height,
  });
}
