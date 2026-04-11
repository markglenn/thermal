import { useState, useRef, useEffect } from 'react';

interface UseDebouncedPreviewOptions {
  /** The ZPL string to preview. */
  zpl: string;
  /** Whether the label has any components. */
  hasComponents: boolean;
  /** Fetch function that returns an image URL (data URI or object URL). */
  fetchPreview: () => Promise<string>;
  /** If true, revoke previous object URLs on update (for blob-based previews). */
  revokeUrls?: boolean;
  /** Debounce delay in ms. Default: 500. */
  delay?: number;
}

export function useDebouncedPreview({
  zpl,
  hasComponents,
  fetchPreview,
  revokeUrls = false,
  delay = 500,
}: UseDebouncedPreviewOptions) {
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
        const url = await fetchPreview();
        if (revokeUrls && prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = url;
        setImageUrl(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Preview failed');
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [zpl, hasComponents, fetchPreview, revokeUrls, delay]);

  return { imageUrl, error, loading };
}
