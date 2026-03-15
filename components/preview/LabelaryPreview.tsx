'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import { useDocument } from '@/hooks/use-editor-store';
import { generateZpl } from '@/lib/zpl/generator';
import { fetchLabelaryPreview } from '@/lib/labelary/client';

export function LabelaryPreview() {
  const document = useDocument();
  const zpl = useMemo(() => generateZpl(document), [document]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!zpl || zpl === '^XA\n^PW812\n^LL1218\n^XZ') {
        setImageUrl(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const url = await fetchLabelaryPreview({
          zpl,
          dpi: document.label.dpi,
          widthInches: document.label.widthInches,
          heightInches: document.label.heightInches,
        });
        // Revoke previous URL to prevent memory leaks
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = url;
        setImageUrl(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Preview failed');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [zpl, document.label]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</h3>
        {loading && <span className="text-xs text-gray-400">Loading...</span>}
      </div>
      <div className="flex-1 p-3 flex items-center justify-center bg-gray-50 overflow-auto">
        {error && (
          <div className="text-sm text-red-500 text-center">{error}</div>
        )}
        {imageUrl && !error && (
          <img
            src={imageUrl}
            alt="Label preview"
            className="max-w-full max-h-full border border-gray-200 shadow-sm"
          />
        )}
        {!imageUrl && !error && !loading && (
          <div className="text-sm text-gray-400">Add components to see preview</div>
        )}
      </div>
    </div>
  );
}
