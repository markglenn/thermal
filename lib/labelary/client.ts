export interface LabelaryRequest {
  zpl: string;
  dpi: number;
  widthInches: number;
  heightInches: number;
}

export async function fetchLabelaryPreview(req: LabelaryRequest): Promise<string> {
  const response = await fetch('/api/labelary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
