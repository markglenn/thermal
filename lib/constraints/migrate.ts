import type { LabelComponent, ComponentLayout, Constraints, PinnableEdge } from '../types';
import { FALLBACK_WIDTH, FALLBACK_HEIGHT } from '../constants';

/**
 * Convert legacy constraints + pins to the new ComponentLayout model.
 * Called on document load for backward compatibility.
 */
export function migrateConstraintsToLayout(
  constraints: Constraints | undefined,
  pins: PinnableEdge[] | undefined,
): ComponentLayout {
  const c = constraints ?? {};
  const p = pins ?? [];

  const horizontalAnchor = p.includes('right') && !p.includes('left') ? 'right' as const : 'left' as const;
  const verticalAnchor = p.includes('bottom') && !p.includes('top') ? 'bottom' as const : 'top' as const;

  let x: number;
  let width: number;

  if (horizontalAnchor === 'right') {
    x = c.right ?? 0;
    width = c.width ?? FALLBACK_WIDTH;
  } else {
    x = c.left ?? 0;
    width = c.width ?? FALLBACK_WIDTH;
  }

  let y: number;
  let height: number;

  if (verticalAnchor === 'bottom') {
    y = c.bottom ?? 0;
    height = c.height ?? FALLBACK_HEIGHT;
  } else {
    y = c.top ?? 0;
    height = c.height ?? FALLBACK_HEIGHT;
  }

  return { x, y, width, height, horizontalAnchor, verticalAnchor };
}

/**
 * Walk a document's component tree and migrate any components
 * that still use the old constraints/pins model to the new layout model.
 */
export function migrateDocument(components: LabelComponent[]): void {
  for (const comp of components) {
    if (!comp.layout) {
      (comp as LabelComponent).layout = migrateConstraintsToLayout(comp.constraints, comp.pins);
      delete comp.constraints;
      delete comp.pins;
    }
    if (comp.children) {
      migrateDocument(comp.children);
    }
  }
}
