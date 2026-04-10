import type { LabelDocument } from '../types';
import { extractNlblArchive } from './extract';
import { parseSolutionXml, parseFormatXml } from './parse-xml';
import { convertNlblToDocument } from './convert';

export interface NlblImportResult {
  document: LabelDocument;
  name: string;
}

/**
 * Parse a NiceLabel .nlbl file buffer into a Thermal LabelDocument.
 *
 * @param data - Raw file bytes
 * @param password - AES decryption password (from NLBL_PASSWORD env var)
 * @param dpi - Target printer DPI (default 203)
 */
export async function parseNlbl(
  data: Buffer,
  password: string,
  dpi: 203 | 300 | 600 = 203,
): Promise<NlblImportResult> {
  const { solutionXml, formatXml, formatName } = await extractNlblArchive(data, password);

  const variables = parseSolutionXml(solutionXml);
  const { media, textItems, barcodeItems, rectangleItems, lineItems, graphicItems } = parseFormatXml(formatXml);

  const document = convertNlblToDocument({
    name: formatName,
    media,
    variables,
    textItems,
    barcodeItems,
    rectangleItems,
    lineItems,
    graphicItems,
  }, dpi);

  return { document, name: formatName };
}
