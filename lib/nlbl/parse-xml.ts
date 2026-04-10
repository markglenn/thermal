import { XMLParser } from 'fast-xml-parser';
import type {
  NlblVariable,
  NlblTextItem,
  NlblBarcodeItem,
  NlblRectangleItem,
  NlblLineItem,
  NlblMedia,
} from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // Ensure single-element arrays are still arrays
  isArray: (_name, jpath) => {
    return jpath === 'EuroPlus.NiceLabel.Variables.Item'
      || jpath === 'EuroPlus.NiceLabel.Type_Format.DocumentDesigns.DocumentDesign.Items.Item';
  },
});

// ---------------------------------------------------------------------------
// Helpers for navigating parsed XML
// ---------------------------------------------------------------------------

function text(node: unknown): string {
  if (node === undefined || node === null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  // fast-xml-parser may wrap text content in an object with #text
  if (typeof node === 'object' && node !== null && '#text' in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)['#text']);
  }
  return '';
}

function num(node: unknown): number {
  const n = Number(text(node));
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Solution XML (.slnx) — extracts variables
// ---------------------------------------------------------------------------

export function parseSolutionXml(xml: string): NlblVariable[] {
  const doc = parser.parse(xml);
  const root = doc?.['EuroPlus.NiceLabel'];
  if (!root) return [];

  const items = root.Variables?.Item;
  if (!items) return [];

  const variableItems = Array.isArray(items) ? items : [items];
  const variables: NlblVariable[] = [];

  for (const item of variableItems) {
    if (item['@_Type'] !== 'Variable') continue;

    const id = text(item.Id);
    const name = text(item.Name);
    if (!id || !name) continue;

    // Sample value can be in StringContents or DateTimeContents or SystemDateTimeContents
    const sv = item.SampleValue;
    let sampleValue = '';
    if (sv) {
      sampleValue = text(sv.UserValue) || text(sv.StringValue) || '';
    }

    const isRequired = text(item.Constraints?.IsRequired) === 'True';

    variables.push({ id, name, sampleValue, isRequired });
  }

  return variables;
}

// ---------------------------------------------------------------------------
// Format XML — extracts media and document items
// ---------------------------------------------------------------------------

interface FormatParseResult {
  media: NlblMedia;
  textItems: NlblTextItem[];
  barcodeItems: NlblBarcodeItem[];
  rectangleItems: NlblRectangleItem[];
  lineItems: NlblLineItem[];
}

export function parseFormatXml(xml: string): FormatParseResult {
  const doc = parser.parse(xml);
  const root = doc?.['EuroPlus.NiceLabel'];
  if (!root) {
    throw new Error('Invalid NiceLabel format XML: missing root element');
  }

  // Media dimensions (microns)
  const media: NlblMedia = {
    widthMicrons: num(root.Media?.Width),
    heightMicrons: num(root.Media?.Height),
  };

  const textItems: NlblTextItem[] = [];
  const barcodeItems: NlblBarcodeItem[] = [];
  const rectangleItems: NlblRectangleItem[] = [];
  const lineItems: NlblLineItem[] = [];

  // Navigate to document items
  const designs = root.DocumentDesigns?.DocumentDesign;
  if (!designs) return { media, textItems, barcodeItems, rectangleItems, lineItems };

  const design = Array.isArray(designs) ? designs[0] : designs;
  const items = design?.Items?.Item;
  if (!items) return { media, textItems, barcodeItems, rectangleItems, lineItems };

  const itemList = Array.isArray(items) ? items : [items];

  for (const item of itemList) {
    const type = item['@_Type'];

    if (type === 'TextDocumentItem') {
      textItems.push(parseTextItem(item));
    } else if (type === 'BarcodeDocumentItem') {
      barcodeItems.push(parseBarcodeItem(item));
    } else if (type === 'RectangleDocumentItem') {
      rectangleItems.push(parseRectangleItem(item));
    } else if (type === 'LineDocumentItem') {
      lineItems.push(parseLineItem(item));
    }
  }

  return { media, textItems, barcodeItems, rectangleItems, lineItems };
}

/** Extract text content, decoding base64 if flagged. */
function extractContent(item: Record<string, unknown>): string {
  // Check Contents/FixedValue/StringValue for Base64Encoded flag
  const contents = item.Contents as Record<string, unknown> | undefined;
  const fixedValue = contents?.FixedValue as Record<string, unknown> | undefined;
  const stringValue = fixedValue?.StringValue as Record<string, unknown> | undefined;

  if (stringValue && text(stringValue['@_Base64Encoded']) === 'true') {
    const encoded = text(stringValue['#text'] ?? stringValue);
    try {
      return Buffer.from(encoded, 'base64').toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    } catch {
      return text(item.FixedContents);
    }
  }

  return text(item.FixedContents);
}

function parseTextItem(item: Record<string, unknown>): NlblTextItem {
  const geometry = item.Geometry as Record<string, unknown> | undefined;

  return {
    name: text(item.Name),
    left: num(geometry?.Left),
    top: num(geometry?.Top),
    width: num(geometry?.Width),
    height: num(geometry?.Height),
    anchoringPoint: num(geometry?.AnchoringPoint),
    content: extractContent(item),
    contentMask: text(item.ContentsMask),
    fontName: text((item.FontDescriptor as Record<string, unknown>)?.Name),
    fontPointSize: num((item.FontDescriptor as Record<string, unknown>)?.Height),
    fontWeight: num(
      (
        (item.FontDescriptor as Record<string, unknown>)?.LogFontWrapper as
          Record<string, unknown> | undefined
      )?.Weight,
    ),
    justification: num(item.TextBoxAlignment),
    textType: num(item.TextType),
    bestFit: num(item.BestFit) === 1,
    zOrder: num(item.ZOrder),
    dataSourceId: text(
      (item.DataSourceReference as Record<string, unknown> | undefined)?.Id,
    ) || null,
  };
}

function parseBarcodeItem(item: Record<string, unknown>): NlblBarcodeItem {
  const geometry = item.Geometry as Record<string, unknown> | undefined;
  const barcodeData = item.BarcodeData as Record<string, unknown> | undefined;

  return {
    name: text(item.Name),
    x: num(geometry?.X),
    y: num(geometry?.Y),
    anchoringPoint: num(geometry?.AnchoringPoint),
    barcodeType: text(barcodeData?.['@_Type']),
    baseBarWidth: num(barcodeData?.BaseBarWidth),
    moduleHeight: num(barcodeData?.ModuleHeight),
    showText: num(barcodeData?.HumanInterpretationPosition) !== 0,
    content: text(item.FixedContents),
    zOrder: num(item.ZOrder),
    dataSourceId: text(
      (item.DataSourceReference as Record<string, unknown> | undefined)?.Id,
    ) || null,
  };
}

function parseRectangleItem(item: Record<string, unknown>): NlblRectangleItem {
  const geometry = item.Geometry as Record<string, unknown> | undefined;

  return {
    name: text(item.Name),
    left: num(geometry?.Left),
    top: num(geometry?.Top),
    width: num(geometry?.Width),
    height: num(geometry?.Height),
    thickness: num(item.Thickness),
    radius: num(item.Radius),
    filled: num(item.FillStyle) !== 0,
    zOrder: num(item.ZOrder),
  };
}

function parseLineItem(item: Record<string, unknown>): NlblLineItem {
  const geometry = item.Geometry as Record<string, unknown> | undefined;

  return {
    name: text(item.Name),
    startX: num(geometry?.StartPointX),
    startY: num(geometry?.StartPointY),
    endX: num(geometry?.EndPointX),
    endY: num(geometry?.EndPointY),
    thickness: num(item.Thickness),
    zOrder: num(item.ZOrder),
  };
}
