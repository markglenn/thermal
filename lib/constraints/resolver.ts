import type { Constraints, ResolvedBounds, LabelComponent, LabelConfig } from '../types';
import { labelWidthDots, labelHeightDots } from '../constants';

/**
 * Resolve horizontal constraints to x and width.
 * Rules:
 * - left + right → stretch: x = left, w = parentW - left - right
 * - left + width → pinned left: x = left, w = width
 * - right + width → pinned right: x = parentW - right - width, w = width
 * - left + right + width → overconstrained, ignore width, stretch
 * - only width → center: x = (parentW - width) / 2
 * - only left → x = left, w = fallback
 * - only right → x = parentW - right - fallback, w = fallback
 * - none → x = 0, w = fallback
 */
function resolveHorizontal(
  constraints: Constraints,
  parentWidth: number,
  fallbackWidth: number = 100
): { x: number; width: number } {
  const { left, right, width } = constraints;
  const hasLeft = left !== undefined;
  const hasRight = right !== undefined;
  const hasWidth = width !== undefined;

  if (hasLeft && hasRight) {
    // Stretch between edges (width ignored if also set)
    return { x: left!, width: Math.max(0, parentWidth - left! - right!) };
  }
  if (hasLeft && hasWidth) {
    return { x: left!, width: width! };
  }
  if (hasRight && hasWidth) {
    return { x: parentWidth - right! - width!, width: width! };
  }
  if (hasWidth) {
    return { x: Math.round((parentWidth - width!) / 2), width: width! };
  }
  if (hasLeft) {
    return { x: left!, width: fallbackWidth };
  }
  if (hasRight) {
    return { x: parentWidth - right! - fallbackWidth, width: fallbackWidth };
  }
  return { x: 0, width: fallbackWidth };
}

function resolveVertical(
  constraints: Constraints,
  parentHeight: number,
  fallbackHeight: number = 40
): { y: number; height: number } {
  const { top, bottom, height } = constraints;
  const hasTop = top !== undefined;
  const hasBottom = bottom !== undefined;
  const hasHeight = height !== undefined;

  if (hasTop && hasBottom) {
    return { y: top!, height: Math.max(0, parentHeight - top! - bottom!) };
  }
  if (hasTop && hasHeight) {
    return { y: top!, height: height! };
  }
  if (hasBottom && hasHeight) {
    return { y: parentHeight - bottom! - height!, height: height! };
  }
  if (hasHeight) {
    return { y: Math.round((parentHeight - height!) / 2), height: height! };
  }
  if (hasTop) {
    return { y: top!, height: fallbackHeight };
  }
  if (hasBottom) {
    return { y: parentHeight - bottom! - fallbackHeight, height: fallbackHeight };
  }
  return { y: 0, height: fallbackHeight };
}

export function resolveConstraints(
  constraints: Constraints,
  parentWidth: number,
  parentHeight: number
): ResolvedBounds {
  const { x, width } = resolveHorizontal(constraints, parentWidth);
  const { y, height } = resolveVertical(constraints, parentHeight);
  return { x, y, width, height };
}

/**
 * Resolve all components in a tree, returning a flat map of id → ResolvedBounds.
 * Parent bounds are used as the constraint space for children.
 */
export function resolveComponentTree(
  components: LabelComponent[],
  parentWidth: number,
  parentHeight: number
): Map<string, ResolvedBounds> {
  const result = new Map<string, ResolvedBounds>();

  function walk(comps: LabelComponent[], pw: number, ph: number) {
    for (const comp of comps) {
      const bounds = resolveConstraints(comp.constraints, pw, ph);
      result.set(comp.id, bounds);
      if (comp.children && comp.children.length > 0) {
        walk(comp.children, bounds.width, bounds.height);
      }
    }
  }

  walk(components, parentWidth, parentHeight);
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
