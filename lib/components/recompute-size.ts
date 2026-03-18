import type { LabelComponent, Constraints } from '../types';
import { FALLBACK_WIDTH } from '../constants';
import { getDefinition, getSizingMode } from './index';

/**
 * Recompute the content size for a component and write width/height
 * into its constraints. Call this after props change or on load.
 */
export function recomputeContentSize(comp: LabelComponent): void {
  const def = getDefinition(comp.typeData.type);
  if (!def.computeContentSize) return;

  const sizing = getSizingMode(comp);
  if (sizing === 'auto') {
    const size = def.computeContentSize(comp.typeData.props);
    comp.constraints.width = size.width;
    comp.constraints.height = size.height;
  } else if (sizing === 'width-only') {
    const w = comp.constraints.width ?? FALLBACK_WIDTH;
    const size = def.computeContentSize(comp.typeData.props, w);
    comp.constraints.height = size.height;
  }
}

/**
 * Filter constraints based on sizing mode — prevent writes that conflict
 * with auto-computed dimensions.
 */
export function filterConstraintsForMode(
  comp: LabelComponent,
  constraints: Partial<Constraints>
): Partial<Constraints> {
  const def = getDefinition(comp.typeData.type);
  // Only filter for components with computed sizes — DOM-measured components
  // (like text) need their constraints passed through unchanged.
  if (!def.computeContentSize) return constraints;

  const sizing = getSizingMode(comp);
  const filtered = { ...constraints };
  if (sizing === 'auto') {
    delete filtered.width;
    delete filtered.height;
  } else if (sizing === 'width-only') {
    delete filtered.height;
  }
  return filtered;
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
