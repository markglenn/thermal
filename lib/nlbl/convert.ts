import type {
  LabelDocument,
  LabelComponent,
  LabelVariable,
  LabelUnit,
  BarcodeEncoding,
  TextJustification,
  VerticalAlign,
  VisibilityCondition,
} from '../types';
import type { NlblParsedLabel, NlblTextItem, NlblBarcodeItem, NlblRectangleItem, NlblLineItem, NlblGraphicItem, NlblVariable, NlblVisibilityCondition } from './types';
import { computeBarcodeSize } from '../components/barcode/compute-size';

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

function mapVerticalAlign(anchor: number): VerticalAlign | undefined {
  // AnchoringPoint: 0=TL 1=TC 2=TR 3=ML 4=MC 5=MR 6=BL 7=BC 8=BR
  if (anchor >= 3 && anchor <= 5) return 'center';
  if (anchor >= 6 && anchor <= 8) return 'bottom';
  return undefined; // top is the default, omit
}

const BARCODE_TYPE_MAP: Record<string, BarcodeEncoding> = {
  Code128BarcodeData: 'code128',
  Code39BarcodeData: 'code39',
  EAN13BarcodeData: 'ean13',
  UPCABarcodeData: 'upca',
  Interleaved2of5BarcodeData: 'itf',
};

function mapBarcodeEncoding(nlblType: string): BarcodeEncoding {
  return BARCODE_TYPE_MAP[nlblType] ?? 'code128';
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

function resolveVisibilityCondition(
  condition: NlblVisibilityCondition | null,
  variableMap: Map<string, NlblVariable>,
): VisibilityCondition | undefined {
  if (!condition) return undefined;
  const variable = variableMap.get(condition.variableId);
  if (!variable) return undefined;
  return {
    field: variable.name,
    operator: '==',
    value: condition.value,
  };
}

let idCounter = 0;
function nextId(): string {
  return `nlbl-${Date.now()}-${++idCounter}`;
}

/** A predefined label size for matching during import. */
export interface KnownLabelSize {
  widthDots: number;
  heightDots: number;
  dpi: number;
  unit: LabelUnit;
}

/**
 * Convert a parsed NiceLabel label into a Thermal LabelDocument.
 * @param parsed - Intermediate representation from XML parsing
 * @param dpi - Target printer DPI (default 203)
 * @param knownSizes - Predefined label sizes to match against for unit selection
 */
export function convertNlblToDocument(
  parsed: NlblParsedLabel,
  dpi: 203 | 300 | 600 = 203,
  knownSizes?: KnownLabelSize[],
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

  // Convert barcode items (and companion text for contentMask labels)
  for (const item of parsed.barcodeItems) {
    components.push(convertBarcodeItem(item, variableMap, dpi));
    if (item.contentMask) {
      components.push(convertBarcodeMaskText(item, variableMap, dpi));
    }
  }

  // Convert rectangle items
  for (const item of parsed.rectangleItems) {
    components.push(convertRectangleItem(item, dpi));
  }

  // Convert line items
  for (const item of parsed.lineItems) {
    components.push(convertLineItem(item, dpi));
  }

  // Convert graphic items as placeholder images
  for (const item of parsed.graphicItems) {
    components.push(convertGraphicItem(item, variableMap, dpi));
  }

  // Sort by ZOrder (lower = rendered first = below)
  components.sort((a, b) => {
    const aIdx = getOriginalZOrder(a, parsed);
    const bIdx = getOriginalZOrder(b, parsed);
    return aIdx - bIdx;
  });

  // Build variables array from all referenced NiceLabel variables
  // (both data sources and visibility condition variables)
  const usedVariableIds = new Set<string>();
  for (const item of [...parsed.textItems, ...parsed.barcodeItems]) {
    if (item.dataSourceId) usedVariableIds.add(item.dataSourceId);
    if (item.visibilityCondition) usedVariableIds.add(item.visibilityCondition.variableId);
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

  // Try to match a known label size first (exact dots + DPI match).
  // Fall back to heuristic: inches if both dimensions are clean 1/8" values,
  // otherwise mm.
  const matchedSize = knownSizes?.find(
    (s) => s.widthDots === widthDots && s.heightDots === heightDots && s.dpi === dpi,
  );
  let unit: LabelUnit;
  if (matchedSize) {
    unit = matchedSize.unit;
  } else {
    const widthInches = parsed.media.widthMicrons / 25400;
    const heightInches = parsed.media.heightMicrons / 25400;
    const isCleanInches = (widthInches * 8) % 1 < 0.01 && (heightInches * 8) % 1 < 0.01;
    unit = isCleanInches ? 'in' : 'mm';
  }

  return {
    version: 1,
    label: {
      dpi,
      variants: [{
        name: 'Default',
        widthDots,
        heightDots,
        unit,
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
  // For variable-bound items, build a template with {} placeholder.
  // ContentsMask asterisks (*) mark where the variable value goes:
  //   "Rack ID:******" → "Rack ID:{}"
  //   "Rack ID:" (no asterisks) → "Rack ID:{}"
  // For non-variable items, use FixedContents directly.
  let content: string;
  if (variable) {
    if (item.contentMask) {
      // Replace trailing asterisk run with {}, or append {} if no asterisks
      const maskWithPlaceholder = item.contentMask.includes('*')
        ? item.contentMask.replace(/\*+/g, '{}')
        : `${item.contentMask}{}`;
      content = maskWithPlaceholder;
    } else {
      content = '{}';
    }
  } else {
    content = item.content || 'Text';
  }
  const fontSize = pointsToDots(item.fontPointSize, dpi);
  const justification = mapJustification(item.justification);
  const verticalAlign = mapVerticalAlign(item.anchoringPoint);
  // TextType 2 = Text Box (fixed-size rectangle), always needs a field block.
  // Also create field block for non-left justification.
  const isTextBox = item.textType === 2;
  const needsFieldBlock = isTextBox || justification !== 'L';

  const { left, top } = adjustForAnchor(item.left, item.top, item.width, item.height, item.anchoringPoint);
  const x = micronsToDots(left, dpi);
  const y = micronsToDots(top, dpi);
  const width = micronsToDots(left + item.width, dpi) - x;
  const height = micronsToDots(top + item.height, dpi) - y;

  return {
    id: nextId(),
    name: variable?.name ?? item.name,
    layout: {
      x,
      y,
      width: Math.max(width, 10),
      height: Math.max(height, fontSize),
      horizontalAnchor: 'left',
      verticalAnchor: 'top',
    },
    ...(variable ? { fieldBinding: variable.name } : {}),
    visibilityCondition: resolveVisibilityCondition(item.visibilityCondition, variableMap),
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
            maxLines: Math.max(1, Math.round(height / fontSize) || 1),
            lineSpacing: 0,
            justification,
            ...(verticalAlign ? { verticalAlign } : {}),
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
  // Use cleaned sample value, falling back to FixedContents or a default.
  // cleanSampleValue("??????") returns "" so we need the || chain.
  const content = (variable ? cleanSampleValue(variable.sampleValue) : '')
    || item.content || '1234567890';
  const encoding = mapBarcodeEncoding(item.barcodeType);
  const barcodeHeight = Math.max(20, micronsToDots(item.moduleHeight, dpi));
  const moduleWidth = item.baseBarWidth > 0 ? Math.max(1, micronsToDots(item.baseBarWidth, dpi)) : undefined;

  // Compute the actual barcode dimensions so we can adjust for anchoring
  const barcodeSize = computeBarcodeSize({
    content, encoding, height: barcodeHeight, moduleWidth, showText: item.showText, rotation: 0,
  });

  // Adjust position from anchor point to top-left
  let x = micronsToDots(item.x, dpi);
  let y = micronsToDots(item.y, dpi);
  const anchor = item.anchoringPoint;
  if (anchor === 1 || anchor === 4 || anchor === 7) x -= Math.round(barcodeSize.width / 2);
  if (anchor === 2 || anchor === 5 || anchor === 8) x -= barcodeSize.width;
  if (anchor >= 3 && anchor <= 5) y -= Math.round(barcodeSize.height / 2);
  if (anchor >= 6) y -= barcodeSize.height;

  return {
    id: nextId(),
    name: variable?.name ?? item.name,
    layout: {
      x,
      y,
      width: barcodeSize.width,
      height: barcodeSize.height,
      horizontalAnchor: 'left',
      verticalAnchor: 'top',
    },
    ...(variable ? { fieldBinding: variable.name } : {}),
    visibilityCondition: resolveVisibilityCondition(item.visibilityCondition, variableMap),
    typeData: {
      type: 'barcode',
      props: {
        content,
        encoding,
        height: barcodeHeight,
        ...(moduleWidth ? { moduleWidth } : {}),
        showText: item.showText,
        rotation: 0,
      },
    },
  };
}

/** Create a text label below a barcode from its ContentsMask (e.g. "Order Number: 0000000"). */
function convertBarcodeMaskText(
  item: NlblBarcodeItem,
  variableMap: Map<string, NlblVariable>,
  dpi: number,
): LabelComponent {
  const variable = item.dataSourceId ? variableMap.get(item.dataSourceId) : null;
  const maskContent = item.contentMask.includes('*')
    ? item.contentMask.replace(/\*+/g, '{}')
    : `${item.contentMask}{}`;

  const encoding = mapBarcodeEncoding(item.barcodeType);
  const barcodeHeight = Math.max(20, micronsToDots(item.moduleHeight, dpi));
  const moduleWidth = item.baseBarWidth > 0 ? Math.max(1, micronsToDots(item.baseBarWidth, dpi)) : undefined;
  const barcodeSize = computeBarcodeSize({
    content: (variable ? cleanSampleValue(variable.sampleValue) : '') || item.content || '1234567890',
    encoding, height: barcodeHeight, moduleWidth, showText: false, rotation: 0,
  });

  // Position below the barcode
  let x = micronsToDots(item.x, dpi);
  let y = micronsToDots(item.y, dpi);
  const anchor = item.anchoringPoint;
  if (anchor === 1 || anchor === 4 || anchor === 7) x -= Math.round(barcodeSize.width / 2);
  if (anchor >= 3 && anchor <= 5) y -= Math.round(barcodeSize.height / 2);
  if (anchor >= 6) y -= barcodeSize.height;

  const fontSize = pointsToDots(item.humanFontPointSize, dpi);

  return {
    id: nextId(),
    name: `${variable?.name ?? item.name}_label`,
    layout: {
      x,
      y: y + barcodeSize.height,
      width: barcodeSize.width,
      height: fontSize,
      horizontalAnchor: 'left',
      verticalAnchor: 'top',
    },
    ...(variable ? { fieldBinding: variable.name } : {}),
    visibilityCondition: resolveVisibilityCondition(item.visibilityCondition, variableMap),
    typeData: {
      type: 'text',
      props: {
        content: maskContent,
        font: '0',
        fontSize,
        fontWidth: fontSize,
        rotation: 0,
        fieldBlock: {
          maxLines: 1,
          lineSpacing: 0,
          justification: 'C' as const,
        },
      },
    },
  };
}

function convertRectangleItem(
  item: NlblRectangleItem,
  dpi: number,
): LabelComponent {
  // Adjust for anchoring, then compute width/height from rounded edges
  // to avoid 1-dot gaps between adjacent rects.
  const { left, top } = adjustForAnchor(item.left, item.top, item.width, item.height, item.anchoringPoint);
  const x = micronsToDots(left, dpi);
  const y = micronsToDots(top, dpi);
  const width = micronsToDots(left + item.width, dpi) - x;
  const height = micronsToDots(top + item.height, dpi) - y;

  return {
    id: nextId(),
    name: item.name,
    layout: {
      x,
      y,
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

function convertGraphicItem(
  item: NlblGraphicItem,
  variableMap: Map<string, NlblVariable>,
  dpi: number,
): LabelComponent {
  const { left, top } = adjustForAnchor(item.left, item.top, item.width, item.height, item.anchoringPoint);
  const x = micronsToDots(left, dpi);
  const y = micronsToDots(top, dpi);
  const width = Math.max(10, micronsToDots(left + item.width, dpi) - x);
  const height = Math.max(10, micronsToDots(top + item.height, dpi) - y);
  const variable = item.dataSourceId ? variableMap.get(item.dataSourceId) : null;

  return {
    id: nextId(),
    name: variable?.name ?? item.name,
    layout: { x, y, width, height, horizontalAnchor: 'left', verticalAnchor: 'top' },
    ...(variable ? { fieldBinding: variable.name } : {}),
    typeData: {
      type: 'image',
      props: {
        data: '',
        originalWidth: width,
        originalHeight: height,
        objectFit: 'fit',
        objectPosition: 'center',
        threshold: 128,
        invert: false,
        monochromeMethod: 'threshold',
        monochromePreview: '',
        monochromePreviewFull: '',
        zplHex: '',
        zplBytesPerRow: 0,
        zplWidth: 0,
        zplHeight: 0,
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
    ...parsed.graphicItems.map((g) => ({ name: g.name, zOrder: g.zOrder })),
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
