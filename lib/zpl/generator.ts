import type { LabelDocument, LabelComponent, ResolvedBounds } from '../types';
import { labelWidthDots, labelHeightDots } from '../constants';
import { resolveDocument } from '../constraints/resolver';
import { getDefinition } from '../components';
import { assignFieldNumbers } from './field-numbers';

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

/** Generate static ZPL with all content baked in (for preview). */
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

/**
 * Replace the ^FD...^FS line in a component's ZPL with either:
 * - ^FN{n}"{name}"^FS (for stored format templates)
 * - ^FD{newContent}^FS (for merge/substitution)
 */
function replaceFD(lines: string[], replacement: string): string[] {
  return lines.map((line) =>
    line.match(/\^FD.*\^FS$/) ? replacement : line
  );
}

/**
 * Generate a ^DF stored format with ^FN placeholders for bound fields.
 * Static components render normally; bound components get ^FN instead of ^FD.
 */
export function generateZplTemplate(document: LabelDocument, formatName: string = 'R:THERMAL.ZPL'): string {
  const boundsMap = resolveDocument(document);
  const fieldMap = assignFieldNumbers(document.components);
  const widthDots = labelWidthDots(document.label);
  const heightDots = labelHeightDots(document.label);

  const lines: string[] = [];
  lines.push('^XA');
  lines.push(`^DF${formatName}^FS`);
  lines.push(`^PW${widthDots}`);
  lines.push(`^LL${heightDots}`);

  function walkTemplate(components: LabelComponent[], offsetX: number, offsetY: number) {
    for (const comp of components) {
      const localBounds = boundsMap.get(comp.id);
      if (!localBounds) continue;

      const bounds: ResolvedBounds = {
        x: localBounds.x + offsetX,
        y: localBounds.y + offsetY,
        width: localBounds.width,
        height: localBounds.height,
      };

      const def = getDefinition(comp.typeData.type);
      let compLines = [...def.generateZpl(comp.typeData.props, bounds)];

      const fn = fieldMap.byComponentId.get(comp.id);
      if (fn !== undefined && comp.fieldBinding) {
        compLines = replaceFD(compLines, `^FN${fn}"${comp.fieldBinding}"^FS`);
      }

      lines.push(...compLines);

      if (comp.children) {
        walkTemplate(comp.children, bounds.x, bounds.y);
      }
    }
  }

  walkTemplate(document.components, 0, 0);
  lines.push('^XZ');
  return lines.join('\n');
}

/**
 * Generate ready-to-print ZPL with field data substituted into bound components.
 * Missing fields fall back to the component's default content.
 */
export function generateZplMerge(document: LabelDocument, fieldData: Record<string, string>): string {
  const boundsMap = resolveDocument(document);
  const widthDots = labelWidthDots(document.label);
  const heightDots = labelHeightDots(document.label);

  const lines: string[] = [];
  lines.push('^XA');
  lines.push(`^PW${widthDots}`);
  lines.push(`^LL${heightDots}`);

  function walkMerge(components: LabelComponent[], offsetX: number, offsetY: number) {
    for (const comp of components) {
      const localBounds = boundsMap.get(comp.id);
      if (!localBounds) continue;

      const bounds: ResolvedBounds = {
        x: localBounds.x + offsetX,
        y: localBounds.y + offsetY,
        width: localBounds.width,
        height: localBounds.height,
      };

      const def = getDefinition(comp.typeData.type);
      let compLines = [...def.generateZpl(comp.typeData.props, bounds)];

      if (comp.fieldBinding && comp.fieldBinding in fieldData) {
        const value = fieldData[comp.fieldBinding];
        compLines = replaceFD(compLines, `^FD${value}^FS`);
      }

      lines.push(...compLines);

      if (comp.children) {
        walkMerge(comp.children, bounds.x, bounds.y);
      }
    }
  }

  walkMerge(document.components, 0, 0);
  lines.push('^XZ');
  return lines.join('\n');
}
