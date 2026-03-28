'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import { useDocument, useActiveVariant } from '@/lib/store/editor-context';
import { generateZpl } from '@/lib/zpl/generator';
import { fetchLabelaryPreview } from '@/lib/labelary/client';
import { labelWidthDots, labelHeightDots, dotsToInches } from '@/lib/constants';
import { Spinner } from '@/components/ui/Spinner';

export function LabelaryPreview() {
  const document = useDocument();
  const activeVariant = useActiveVariant();
  const hasComponents = document.components.length > 0;
  const zpl = useMemo(() => generateZpl(document), [document]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const url = await fetchLabelaryPreview({
          zpl,
          dpi: document.label.dpi,
          widthInches: dotsToInches(labelWidthDots(document.label, activeVariant), document.label.dpi),
          heightInches: dotsToInches(labelHeightDots(document.label, activeVariant), document.label.dpi),
        });
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
  }, [zpl, hasComponents, document.label, activeVariant]);

  return (
    <div className="h-full p-3 flex items-center justify-center bg-gray-50 overflow-auto relative">
      {imageUrl && !error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Label preview"
          className={`max-w-full max-h-full border border-gray-200 shadow-sm transition-opacity ${loading ? 'opacity-40' : ''}`}
        />
      )}
      {error && (
        <div className="text-sm text-gray-400 text-center">Unable to generate preview</div>
      )}
      {!imageUrl && !error && !loading && (
        <div className="text-sm text-gray-400">Add components to your label to see a preview</div>
      )}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="text-gray-400" />
        </div>
      )}
    </div>
  );
}
