import type { LabelDocument, LabelComponent, ResolvedBounds } from '../types';
import { labelWidthDots, labelHeightDots } from '../constants';
import { resolveDocument } from '../constraints/resolver';
import { textCommand, barcodeCommand, qrcodeCommand, lineCommand, rectangleCommand, fieldOrigin } from './commands';

function generateComponentZpl(
  component: LabelComponent,
  boundsMap: Map<string, ResolvedBounds>,
  parentOffsetX: number,
  parentOffsetY: number
): string[] {
  const localBounds = boundsMap.get(component.id);
  if (!localBounds) return [];

  // Absolute bounds = local + parent offset
  const bounds: ResolvedBounds = {
    x: localBounds.x + parentOffsetX,
    y: localBounds.y + parentOffsetY,
    width: localBounds.width,
    height: localBounds.height,
  };

  const lines: string[] = [];

  switch (component.typeData.type) {
    case 'text':
      lines.push(...textCommand(component.typeData.props, bounds));
      break;
    case 'barcode':
      lines.push(...barcodeCommand(component.typeData.props, bounds));
      break;
    case 'qrcode':
      lines.push(...qrcodeCommand(component.typeData.props, bounds));
      break;
    case 'line':
      lines.push(...lineCommand(component.typeData.props, bounds));
      break;
    case 'rectangle':
      lines.push(...rectangleCommand(component.typeData.props, bounds));
      break;
    case 'image':
      // Image ZPL (^GF) is complex, placeholder for now
      lines.push(fieldOrigin(bounds.x, bounds.y));
      lines.push(`^FD[IMAGE]^FS`);
      break;
    case 'container':
      // Container has no ZPL output itself, just recurse children
      break;
  }

  // Recurse children (containers, or any component with children)
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
