import { useState, useCallback, useEffect } from 'react';
import type { MonochromeMethod, ImageProperties } from '@/lib/types';
import {
  convertImageToMonochrome,
  generateMonochromePreview,
} from '@/lib/components/image/convert';

interface UseImageUploadOptions {
  initialProps?: Partial<ImageProperties>;
}

export function useImageUpload({ initialProps }: UseImageUploadOptions = {}) {
  const [data, setData] = useState(initialProps?.data || '');
  const [originalWidth, setOriginalWidth] = useState(initialProps?.originalWidth || 0);
  const [originalHeight, setOriginalHeight] = useState(initialProps?.originalHeight || 0);
  const [threshold, setThreshold] = useState(initialProps?.threshold ?? 128);
  const [invert, setInvert] = useState(initialProps?.invert ?? false);
  const [method, setMethod] = useState<MonochromeMethod>(initialProps?.monochromeMethod ?? 'threshold');
  const [preview, setPreview] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  const loadBase64 = useCallback((base64: string) => {
    const img = new Image();
    img.onload = () => {
      setData(base64);
      setOriginalWidth(img.naturalWidth);
      setOriginalHeight(img.naturalHeight);
    };
    img.src = base64;
  }, []);

  const loadImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      loadBase64(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [loadBase64]);

  const loadImageUrl = useCallback(async (url: string) => {
    setUrlError('');
    setUrlLoading(true);
    try {
      const proxyUrl = `/api/fetch-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${response.status}`);
      }
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('Not an image');
      const reader = new FileReader();
      reader.onload = (e) => {
        loadBase64(e.target?.result as string);
        setUrlLoading(false);
      };
      reader.onerror = () => {
        setUrlError('Failed to read image');
        setUrlLoading(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to fetch');
      setUrlLoading(false);
    }
  }, [loadBase64]);

  // Generate monochrome preview when settings change
  useEffect(() => {
    if (!data || originalWidth === 0) return;
    let cancelled = false;
    generateMonochromePreview(data, originalWidth, originalHeight, threshold, invert, method).then(
      (previewUri) => {
        if (!cancelled) setPreview(previewUri);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [data, originalWidth, originalHeight, threshold, invert, method]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) loadImageFile(file);
    },
    [loadImageFile]
  );

  const reset = () => {
    setData('');
    setPreview('');
    setOriginalWidth(0);
    setOriginalHeight(0);
  };

  const confirm = async (): Promise<Omit<ImageProperties, never> | null> => {
    if (!data) return null;
    setIsProcessing(true);
    const result = await convertImageToMonochrome(
      data,
      originalWidth,
      originalHeight,
      threshold,
      invert,
      method
    );
    return {
      data,
      originalWidth,
      originalHeight,
      objectFit: initialProps?.objectFit ?? 'fit',
      objectPosition: initialProps?.objectPosition ?? 'center',
      threshold,
      invert,
      monochromeMethod: method,
      monochromePreview: preview,
      monochromePreviewFull: preview,
      zplHex: result.hex,
      zplBytesPerRow: result.bytesPerRow,
      zplWidth: result.width,
      zplHeight: result.height,
    };
  };

  return {
    data,
    originalWidth,
    originalHeight,
    threshold,
    setThreshold,
    invert,
    setInvert,
    method,
    setMethod,
    preview,
    isDragOver,
    setIsDragOver,
    isProcessing,
    urlInput,
    setUrlInput,
    urlError,
    urlLoading,
    loadImageFile,
    loadImageUrl,
    handleDrop,
    reset,
    confirm,
  };
}
