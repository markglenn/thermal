let rendererPromise: Promise<{ api: { zplToBase64Async: (zpl: string, widthMm?: number, heightMm?: number, dpmm?: number) => Promise<string> } }> | null = null;

function getRenderer() {
  if (!rendererPromise) {
    rendererPromise = import('zpl-renderer-js').then((mod) => mod.ready);
  }
  return rendererPromise;
}

export interface LabelaryRequest {
  zpl: string;
  dpi: number;
  widthInches: number;
  heightInches: number;
}

export async function fetchLabelaryPreview(req: LabelaryRequest): Promise<string> {
  const { api } = await getRenderer();

  const dpmmMap: Record<number, number> = { 203: 8, 300: 12, 600: 24 };
  const dpmm = dpmmMap[req.dpi] || 8;
  const widthMm = req.widthInches * 25.4;
  const heightMm = req.heightInches * 25.4;

  const base64 = await api.zplToBase64Async(req.zpl, widthMm, heightMm, dpmm);
  return `data:image/png;base64,${base64}`;
}
