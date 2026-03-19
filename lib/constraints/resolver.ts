import type { ComponentLayout, ResolvedBounds, LabelComponent, LabelConfig } from '../types';
import { labelWidthDots, labelHeightDots } from '../constants';

/**
 * Resolve a component's layout to absolute screen position.
 * Anchors determine which edge the x/y offset is measured from.
 */
export function resolveLayout(
  layout: ComponentLayout,
  parentWidth: number,
  parentHeight: number
): ResolvedBounds {
  const x = layout.horizontalAnchor === 'right'
    ? parentWidth - layout.x - layout.width
    : layout.horizontalAnchor === 'center'
    ? Math.round((parentWidth - layout.width) / 2) + layout.x
    : layout.x;

  const y = layout.verticalAnchor === 'bottom'
    ? parentHeight - layout.y - layout.height
    : layout.y;

  return { x, y, width: layout.width, height: layout.height };
}

/**
 * Resolve all components, returning a flat map of id → ResolvedBounds.
 */
export function resolveComponentTree(
  components: LabelComponent[],
  parentWidth: number,
  parentHeight: number
): Map<string, ResolvedBounds> {
  const result = new Map<string, ResolvedBounds>();
  for (const comp of components) {
    const bounds = resolveLayout(comp.layout, parentWidth, parentHeight);
    result.set(comp.id, bounds);
  }
  return result;
}

/**
 * Resolve the full document tree.
 */
export function resolveDocument(doc: { label: LabelConfig; components: LabelComponent[] }): Map<string, ResolvedBounds> {
  return resolveComponentTree(
    doc.components,
    labelWidthDots(doc.label),
    labelHeightDots(doc.label)
  );
}

// Legacy exports for backward compatibility during migration
export { resolveLayout as resolveConstraints };
