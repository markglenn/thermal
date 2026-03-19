import type { LabelDocument, LabelComponent, ResolvedBounds } from '../types';
import { labelWidthDots, labelHeightDots } from '../constants';
import { resolveDocument } from '../constraints/resolver';
import { getDefinition } from '../components';
import { assignFieldNumbers } from './field-numbers';

function generateComponentZpl(
  component: LabelComponent,
  boundsMap: Map<string, ResolvedBounds>,
): string[] {
  const bounds = boundsMap.get(component.id);
  if (!bounds) return [];

  const def = getDefinition(component.typeData.type);
  return [...def.generateZpl(component.typeData.props, bounds)];
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
    lines.push(...generateComponentZpl(component, boundsMap));
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
 * Note: Image bindings are included as static fallbacks — ZPL's ^FN mechanism
 * only works with ^FD fields, not ^GFA images. Use generateZplMerge for
 * image field substitution.
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

  for (const comp of document.components) {
    const bounds = boundsMap.get(comp.id);
    if (!bounds) continue;

    const def = getDefinition(comp.typeData.type);
    let compLines = [...def.generateZpl(comp.typeData.props, bounds)];

    const fn = fieldMap.byComponentId.get(comp.id);
    if (fn !== undefined && comp.fieldBinding && comp.typeData.type !== 'image') {
      compLines = replaceFD(compLines, `^FN${fn}"${comp.fieldBinding}"^FS`);
    }

    lines.push(...compLines);
  }
  lines.push('^XZ');
  return lines.join('\n');
}
