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

  // Clamp to non-negative — ZPL ^FO coordinates are clamped to 0 by the
  // printer firmware, so the canvas should match the actual printed result.
  return { x: Math.max(0, x), y: Math.max(0, y), width: layout.width, height: layout.height };
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
export function resolveDocument(doc: { label: LabelConfig; components: LabelComponent[] }, activeVariant?: string): Map<string, ResolvedBounds> {
  return resolveComponentTree(
    doc.components,
    labelWidthDots(doc.label, activeVariant),
    labelHeightDots(doc.label, activeVariant)
  );
}
