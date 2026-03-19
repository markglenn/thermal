import type { LabelDocument, ResolvedBounds, ImageProperties } from '../types';
import { labelWidthDots, labelHeightDots } from '../constants';
import { resolveDocument } from '../constraints/resolver';
import { getDefinition } from '../components';
import { fieldOrigin } from './commands';
import { convertImageUrlToMonochrome } from '@/lib/components/image/convert-server';
import { resolveImageLayout } from '@/lib/components/image/fit';

/**
 * Replace the ^FD...^FS line with new content.
 */
function replaceFD(lines: string[], replacement: string): string[] {
  return lines.map((line) =>
    line.match(/\^FD.*\^FS$/) ? replacement : line
  );
}

/**
 * Generate ready-to-print ZPL with field data substituted into bound components.
 * Missing fields fall back to the component's default content.
 * Image bindings accept a URL — the image is fetched and converted server-side.
 */
export async function generateZplMerge(document: LabelDocument, fieldData: Record<string, string>): Promise<string> {
  const boundsMap = resolveDocument(document);
  const widthDots = labelWidthDots(document.label);
  const heightDots = labelHeightDots(document.label);

  const lines: string[] = [];
  lines.push('^XA');
  lines.push(`^PW${widthDots}`);
  lines.push(`^LL${heightDots}`);

  for (const comp of document.components) {
    const bounds = boundsMap.get(comp.id);
    if (!bounds) continue;

    const def = getDefinition(comp.typeData.type);
    let compLines = [...def.generateZpl(comp.typeData.props, bounds)];

    if (comp.fieldBinding && comp.fieldBinding in fieldData) {
      if (comp.typeData.type === 'image') {
        const imageUrl = fieldData[comp.fieldBinding];
        const imageProps = comp.typeData.props as ImageProperties;
        const imgLayout = resolveImageLayout(
          bounds.width, bounds.height,
          imageProps.originalWidth, imageProps.originalHeight,
          imageProps.objectFit, imageProps.objectPosition,
        );
        const result = await convertImageUrlToMonochrome(
          imageUrl,
          imgLayout.width,
          imgLayout.height,
          imageProps.threshold,
          imageProps.invert,
          imageProps.monochromeMethod
        );
        const totalBytes = result.bytesPerRow * result.height;
        compLines = [
          fieldOrigin(bounds.x + imgLayout.offsetX, bounds.y + imgLayout.offsetY),
          `^GFA,${totalBytes},${totalBytes},${result.bytesPerRow},${result.hex}`,
          '^FS',
        ];
      } else {
        const value = fieldData[comp.fieldBinding];
        compLines = replaceFD(compLines, `^FD${value}^FS`);
      }
    }

    lines.push(...compLines);
  }
  lines.push('^XZ');
  return lines.join('\n');
}
