import type { LabelDocument, LabelComponent, ResolvedBounds } from '../types';
import { labelWidthDots, labelHeightDots } from '../constants';
import { resolveDocument } from '../constraints/resolver';
import { getDefinition } from '../components';

function generateComponentZpl(
  component: LabelComponent,
  boundsMap: Map<string, ResolvedBounds>,
  parentOffsetX: number,
  parentOffsetY: number
): string[] {
  const localBounds = boundsMap.get(component.id);
  if (!localBounds) return [];

  const bounds: ResolvedBounds = {
    x: localBounds.x + parentOffsetX,
    y: localBounds.y + parentOffsetY,
    width: localBounds.width,
    height: localBounds.height,
  };

  const def = getDefinition(component.typeData.type);
  const lines = [...def.generateZpl(component.typeData.props, bounds)];

  // Recurse children
  if (component.children) {
    for (const child of component.children) {
      lines.push(...generateComponentZpl(child, boundsMap, bounds.x, bounds.y));
    }
  }

  return lines;
}

export function generateZpl(document: LabelDocument): string {
  const boundsMap = resolveDocument(document);
  const widthDots = labelWidthDots(document.label);
  const heightDots = labelHeightDots(document.label);

  const lines: string[] = [];
  lines.push('^XA');
  lines.push(`^PW${widthDots}`);
  lines.push(`^LL${heightDots}`);

  for (const component of document.components) {
    lines.push(...generateComponentZpl(component, boundsMap, 0, 0));
  }

  lines.push('^XZ');
  return lines.join('\n');
}
