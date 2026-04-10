import type {
  LabelDocument,
  LabelComponent,
  LabelVariable,
  TextJustification,
} from '../types';
import type { NlblParsedLabel, NlblTextItem, NlblBarcodeItem, NlblRectangleItem, NlblLineItem, NlblVariable } from './types';

// ---------------------------------------------------------------------------
// Unit conversion
// ---------------------------------------------------------------------------

/** Convert NiceLabel microns (1/1000 mm) to dots at a given DPI. */
export function micronsToDots(microns: number, dpi: number): number {
  // 1 inch = 25.4 mm = 25400 microns
  return Math.round((microns / 25400) * dpi);
}

/** Convert a point size to ZPL dots. */
function pointsToDots(points: number, dpi: number): number {
  if (points <= 0) return 30; // reasonable fallback
  // 1 point = 1/72 inch
  return Math.max(10, Math.round((points / 72) * dpi));
}

// ---------------------------------------------------------------------------
// Map NiceLabel TextBoxAlignment to Thermal TextJustification
// ---------------------------------------------------------------------------

/**
 * Adjust left/top coordinates based on NiceLabel's AnchoringPoint.
 * NiceLabel stores the position of the anchor point, not always the top-left.
 * AnchoringPoint: 0=TL 1=TC 2=TR 3=ML 4=MC 5=MR 6=BL 7=BC 8=BR
 */
function adjustForAnchor(
  left: number,
  top: number,
  width: number,
  height: number,
  anchor: number,
): { left: number; top: number } {
  let adjustedLeft = left;
  let adjustedTop = top;

  // Horizontal: 1,4,7 = center; 2,5,8 = right
  if (anchor === 1 || anchor === 4 || anchor === 7) {
    adjustedLeft = left - width / 2;
  } else if (anchor === 2 || anchor === 5 || anchor === 8) {
    adjustedLeft = left - width;
  }

  // Vertical: 3,4,5 = middle; 6,7,8 = bottom
  if (anchor === 3 || anchor === 4 || anchor === 5) {
    adjustedTop = top - height / 2;
  } else if (anchor === 6 || anchor === 7 || anchor === 8) {
    adjustedTop = top - height;
  }

  return { left: adjustedLeft, top: adjustedTop };
}

function mapJustification(nlblAlign: number): TextJustification {
  // NiceLabel: 0 = left, 1 = right, 2 = center, 3 = justified
  if (nlblAlign === 1) return 'R';
  if (nlblAlign === 2) return 'C';
  if (nlblAlign === 3) return 'J';
  return 'L';
}

// ---------------------------------------------------------------------------
// Main conversion
// ---------------------------------------------------------------------------

let idCounter = 0;
function nextId(): string {
  return `nlbl-${Date.now()}-${++idCounter}`;
}

/**
 * Convert a parsed NiceLabel label into a Thermal LabelDocument.
 * @param parsed - Intermediate representation from XML parsing
 * @param dpi - Target printer DPI (default 203)
 */
export function convertNlblToDocument(
  parsed: NlblParsedLabel,
  dpi: 203 | 300 | 600 = 203,
): LabelDocument {
  const variableMap = new Map<string, NlblVariable>();
  for (const v of parsed.variables) {
    variableMap.set(v.id, v);
  }

  const components: LabelComponent[] = [];

  // Convert text items
  for (const item of parsed.textItems) {
    components.push(convertTextItem(item, variableMap, dpi));
  }

  // Convert barcode items
  for (const item of parsed.barcodeItems) {
    components.push(convertBarcodeItem(item, variableMap, dpi));
  }

  // Convert rectangle items
  for (const item of parsed.rectangleItems) {
    components.push(convertRectangleItem(item, dpi));
  }

  // Convert line items
  for (const item of parsed.lineItems) {
    components.push(convertLineItem(item, dpi));
  }

  // Sort by ZOrder (lower = rendered first = below)
  components.sort((a, b) => {
    const aIdx = getOriginalZOrder(a, parsed);
    const bIdx = getOriginalZOrder(b, parsed);
    return aIdx - bIdx;
  });

  // Build variables array from all referenced NiceLabel variables
  const usedVariableIds = new Set<string>();
  for (const item of [...parsed.textItems, ...parsed.barcodeItems]) {
    if (item.dataSourceId) usedVariableIds.add(item.dataSourceId);
  }

  const variables: LabelVariable[] = [];
  for (const v of parsed.variables) {
    if (usedVariableIds.has(v.id)) {
      variables.push({
        name: v.name,
        type: 'text',
        defaultValue: cleanSampleValue(v.sampleValue),
      });
    }
  }

  const widthDots = micronsToDots(parsed.media.widthMicrons, dpi);
  const heightDots = micronsToDots(parsed.media.heightMicrons, dpi);

  return {
    version: 1,
    label: {
      dpi,
      variants: [{
        name: 'Default',
        widthDots,
        heightDots,
        unit: 'mm',
      }],
    },
    components,
    variables: variables.length > 0 ? variables : undefined,
  };
}

// ---------------------------------------------------------------------------
// Component converters
// ---------------------------------------------------------------------------

function convertTextItem(
  item: NlblTextItem,
  variableMap: Map<string, NlblVariable>,
  dpi: number,
): LabelComponent {
  const variable = item.dataSourceId ? variableMap.get(item.dataSourceId) : null;
  // For variable-bound items, NiceLabel displays: contentMask + variable sample value.
  // For non-variable items, use FixedContents directly.
  const content = variable
    ? (item.contentMask + variable.sampleValue) || item.content || 'Text'
    : item.content || 'Text';
  const fontSize = pointsToDots(item.fontPointSize, dpi);
  const justification = mapJustification(item.justification);
  const needsFieldBlock = justification !== 'L' || item.width > 0;

  const width = micronsToDots(item.width, dpi);
  const height = micronsToDots(item.height, dpi);
  const { left, top } = adjustForAnchor(item.left, item.top, item.width, item.height, item.anchoringPoint);

  return {
    id: nextId(),
    name: variable?.name ?? item.name,
    layout: {
      x: micronsToDots(left, dpi),
      y: micronsToDots(top, dpi),
      width: Math.max(width, 10),
      height: Math.max(height, fontSize),
      horizontalAnchor: 'left',
      verticalAnchor: 'top',
    },
    ...(variable ? { fieldBinding: variable.name } : {}),
    typeData: {
      type: 'text',
      props: {
        content,
        font: '0',
        fontSize,
        fontWidth: fontSize,
        rotation: 0,
        ...(needsFieldBlock ? {
          fieldBlock: {
            maxLines: Math.max(1, Math.floor(height / fontSize) || 1),
            lineSpacing: 0,
            justification,
          },
        } : {}),
      },
    },
  };
}

function convertBarcodeItem(
  item: NlblBarcodeItem,
  variableMap: Map<string, NlblVariable>,
  dpi: number,
): LabelComponent {
  const variable = item.dataSourceId ? variableMap.get(item.dataSourceId) : null;
  const content = variable?.sampleValue
    ? cleanSampleValue(variable.sampleValue)
    : item.content || '1234567890';
  const barcodeHeight = Math.max(20, micronsToDots(item.moduleHeight, dpi));

  return {
    id: nextId(),
    name: variable?.name ?? item.name,
    layout: {
      x: micronsToDots(item.x, dpi),
      y: micronsToDots(item.y, dpi),
      width: 100, // auto-sized, placeholder
      height: barcodeHeight,
      horizontalAnchor: 'left',
      verticalAnchor: 'top',
    },
    ...(variable ? { fieldBinding: variable.name } : {}),
    typeData: {
      type: 'barcode',
      props: {
        content,
        encoding: 'code128',
        height: barcodeHeight,
        showText: item.showText,
        rotation: 0,
      },
    },
  };
}

function convertRectangleItem(
  item: NlblRectangleItem,
  dpi: number,
): LabelComponent {
  const width = micronsToDots(item.width, dpi);
  const height = micronsToDots(item.height, dpi);

  return {
    id: nextId(),
    name: item.name,
    layout: {
      x: micronsToDots(item.left, dpi),
      y: micronsToDots(item.top, dpi),
      width: Math.max(width, 10),
      height: Math.max(height, 10),
      horizontalAnchor: 'left',
      verticalAnchor: 'top',
    },
    typeData: {
      type: 'rectangle',
      props: {
        borderThickness: Math.max(1, micronsToDots(item.thickness, dpi)),
        cornerRadius: micronsToDots(item.radius, dpi),
        filled: item.filled,
      },
    },
  };
}

function convertLineItem(
  item: NlblLineItem,
  dpi: number,
): LabelComponent {
  const x1 = micronsToDots(item.startX, dpi);
  const y1 = micronsToDots(item.startY, dpi);
  const x2 = micronsToDots(item.endX, dpi);
  const y2 = micronsToDots(item.endY, dpi);

  // Determine orientation from endpoints
  const isVertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
  const orientation = isVertical ? 'vertical' : 'horizontal';

  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const thickness = Math.max(1, micronsToDots(item.thickness, dpi));
  const width = isVertical ? thickness : Math.max(10, Math.abs(x2 - x1));
  const height = isVertical ? Math.max(10, Math.abs(y2 - y1)) : thickness;

  return {
    id: nextId(),
    name: item.name,
    layout: {
      x,
      y,
      width,
      height,
      horizontalAnchor: 'left',
      verticalAnchor: 'top',
    },
    typeData: {
      type: 'line',
      props: {
        thickness,
        orientation,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOriginalZOrder(component: LabelComponent, parsed: NlblParsedLabel): number {
  const allItems = [
    ...parsed.textItems.map((t) => ({ name: t.name, zOrder: t.zOrder })),
    ...parsed.barcodeItems.map((b) => ({ name: b.name, zOrder: b.zOrder })),
    ...parsed.rectangleItems.map((r) => ({ name: r.name, zOrder: r.zOrder })),
    ...parsed.lineItems.map((l) => ({ name: l.name, zOrder: l.zOrder })),
  ];
  return allItems.find((i) => i.name === component.name)?.zOrder ?? 0;
}

/** Strip NiceLabel placeholder markers like <<variable>> and ?????? */
function cleanSampleValue(value: string): string {
  if (value === '??????') return '';
  // Strip << >> wrappers
  const match = value.match(/^<<(.+)>>$/);
  if (match) return match[1];
  return value;
}
