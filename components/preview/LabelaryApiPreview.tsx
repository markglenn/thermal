'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import { useDocument } from '@/lib/store/editor-context';
import { generateZpl } from '@/lib/zpl/generator';
import { fetchLabelaryApiPreview } from '@/lib/labelary/api-client';

export function LabelaryApiPreview() {
  const document = useDocument();
  const hasComponents = document.components.length > 0;
  const zpl = useMemo(() => generateZpl(document), [document]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!hasComponents) {
      setImageUrl(null);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const url = await fetchLabelaryApiPreview({
          zpl,
          dpi: document.label.dpi,
          widthInches: document.label.widthInches,
          heightInches: document.label.heightInches,
        });
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
  }, [zpl, hasComponents, document.label]);

  return (
    <div className="h-full p-3 flex items-center justify-center bg-gray-50 overflow-auto">
      {imageUrl && !error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Labelary preview"
          className="max-w-full max-h-full border border-gray-200 shadow-sm"
        />
      )}
      {error && (
        <div className="text-sm text-gray-400 text-center">Unable to generate preview</div>
      )}
      {!imageUrl && !error && !loading && (
        <div className="text-sm text-gray-400">Add components to your label to see a preview</div>
      )}
      {loading && !imageUrl && (
        <div className="text-sm text-gray-400">Loading...</div>
      )}
    </div>
  );
}
