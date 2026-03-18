import type { LabelComponent } from '../types';
import { FALLBACK_WIDTH } from '../constants';
import { getDefinition, getSizingMode } from './index';

/**
 * Recompute the content size for a component and write width/height
 * into its layout. Call this after props change or on load.
 */
export function recomputeContentSize(comp: LabelComponent): void {
  const def = getDefinition(comp.typeData.type);
  if (!def.computeContentSize) return;

  const sizing = getSizingMode(comp);
  if (sizing === 'auto') {
    const size = def.computeContentSize(comp.typeData.props);
    comp.layout.width = size.width;
    comp.layout.height = size.height;
  } else if (sizing === 'width-only') {
    const w = comp.layout.width ?? FALLBACK_WIDTH;
    const size = def.computeContentSize(comp.typeData.props, w);
    comp.layout.height = size.height;
  }
}

/**
 * Walk a document's component tree and recompute sizes for all
 * auto/width-only components. Used on document load to migrate
 * existing documents that lack computed sizes.
 */
export function recomputeAllSizes(components: LabelComponent[]): void {
  for (const comp of components) {
    recomputeContentSize(comp);
    if (comp.children) {
      recomputeAllSizes(comp.children);
    }
  }
}
