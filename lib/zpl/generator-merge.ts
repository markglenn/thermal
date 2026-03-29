import type { LabelDocument, LabelComponent, ImageProperties } from '../types';
import { labelWidthDots, labelHeightDots } from '../constants';
import { resolveDocument } from '../constraints/resolver';
import { getDefinition } from '../components';
import { recomputeContentSize } from '../components/recompute-size';
import { fieldOrigin } from './commands';
import { convertImageUrlToMonochrome } from '@/lib/components/image/convert-server';
import { resolveImageLayout } from '@/lib/components/image/fit';
import { mergeFieldData, evaluateCondition } from '../variables/resolve';

/**
 * Deep-clone a document and substitute field data into bound component props.
 * Recomputes content sizes so layout reflects the substituted data.
 * Image bindings are left as-is (they need async server-side conversion).
 */
export function applyFieldData(doc: LabelDocument, fieldData: Record<string, string>): LabelDocument {
  const cloned: LabelDocument = structuredClone(doc);

  for (const comp of cloned.components) {
    if (!comp.fieldBinding || !(comp.fieldBinding in fieldData)) continue;
    // Skip image — it has custom async conversion, not a simple content swap
    if (comp.typeData.type === 'image') continue;

    const value = fieldData[comp.fieldBinding];
    substituteContent(comp, value);
    recomputeContentSize(comp);
  }

  return cloned;
}

/**
 * Substitute field data into the component's content prop.
 */
function substituteContent(comp: LabelComponent, value: string): void {
  const props = comp.typeData.props;
  if ('content' in props) {
    (props as { content: string }).content = value;
  }
}

/**
 * Generate ready-to-print ZPL with field data substituted into bound components.
 * Missing fields fall back to the component's default content.
 * Image bindings accept a URL — the image is fetched and converted server-side.
 *
 * The pipeline:
 * 1. Clone document and substitute field data into props
 * 2. Recompute content sizes for auto/width-only components
 * 3. Resolve layout with updated sizes (bounds now reflect real data)
 * 4. Generate ZPL with reflowed bounds
 */
export async function generateZplMerge(document: LabelDocument, fieldData: Record<string, string>, index = 0): Promise<string> {
  // Merge caller-supplied field data with resolved variables (date, counter)
  const merged = mergeFieldData(document.variables ?? [], fieldData, index);
  // Apply field data and recompute sizes (handles text, barcode, qrcode)
  const reflowed = applyFieldData(document, merged);
  const boundsMap = resolveDocument(reflowed);
  const widthDots = labelWidthDots(reflowed.label);
  const heightDots = labelHeightDots(reflowed.label);

  const lines: string[] = [];
  lines.push('^XA');
  lines.push(`^PW${widthDots}`);
  lines.push(`^LL${heightDots}`);

  for (const comp of reflowed.components) {
    // Evaluate visibility condition — skip hidden components
    if (comp.visibilityCondition && !evaluateCondition(comp.visibilityCondition, merged)) continue;

    const bounds = boundsMap.get(comp.id);
    if (!bounds) continue;

    const def = getDefinition(comp.typeData.type);
    let compLines = [...def.generateZpl(comp.typeData.props, bounds)];

    // Image bindings need async conversion — handle separately
    if (comp.fieldBinding && comp.fieldBinding in fieldData && comp.typeData.type === 'image') {
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
    }

    lines.push(...compLines);
  }
  lines.push('^XZ');
  return lines.join('\n');
}
