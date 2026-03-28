import type { LabelDocument } from '../types';
import { generateZpl } from '../zpl/generator';
import { labelWidthDots, labelHeightDots, dotsToMm } from '../constants';

let rendererPromise: ReturnType<typeof loadRenderer> | null = null;

function loadRenderer() {
  return import('zpl-renderer-js').then((mod) => mod.ready);
}

function getRenderer() {
  if (!rendererPromise) {
    rendererPromise = loadRenderer();
  }
  return rendererPromise;
}

const DPMM: Record<number, number> = { 203: 8, 300: 12, 600: 24 };

export async function captureThumbnail(
  document: LabelDocument
): Promise<string | null> {
  try {
    const zpl = generateZpl(document);
    const { api } = await getRenderer();
    const dpmm = DPMM[document.label.dpi] || 8;
    const widthMm = dotsToMm(labelWidthDots(document.label), document.label.dpi);
    const heightMm = dotsToMm(labelHeightDots(document.label), document.label.dpi);
    const base64 = await api.zplToBase64Async(zpl, widthMm, heightMm, dpmm);
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}
