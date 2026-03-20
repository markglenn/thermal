'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { MonochromeMethod, ImageProperties } from '@/lib/types';
import {
  convertImageToMonochrome,
  generateMonochromePreview,
} from '@/lib/components/image/convert';

interface Props {
  initialProps?: Partial<ImageProperties>;
  onConfirm: (result: Omit<ImageProperties, never>) => void;
  onCancel: () => void;
}

export function ImageUploadModal({ initialProps, onConfirm, onCancel }: Props) {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleConfirm = async () => {
    if (!data) return;
    setIsProcessing(true);
    const result = await convertImageToMonochrome(
      data,
      originalWidth,
      originalHeight,
      threshold,
      invert,
      method
    );
    onConfirm({
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
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) loadImageFile(file);
    },
    [loadImageFile]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel]
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-[520px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Upload Image</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Drop zone / preview */}
          {!data ? (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-gray-500 text-sm">
                  <p className="font-medium mb-1">Drop an image here</p>
                  <p className="text-xs text-gray-400">or click to choose a file</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) loadImageFile(file);
                  }}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="flex-1 h-px bg-gray-200" />
                <span>or enter a URL</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (urlInput.trim()) loadImageUrl(urlInput.trim());
                }}
                className="flex gap-1.5"
              >
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
                <button
                  type="submit"
                  disabled={!urlInput.trim() || urlLoading}
                  className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50"
                >
                  {urlLoading ? 'Loading...' : 'Fetch'}
                </button>
              </form>
              {urlError && (
                <p className="text-xs text-red-500">{urlError}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Side-by-side preview */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Original</span>
                  <div className="border border-gray-200 rounded bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)_0_0/16px_16px] flex items-center justify-center p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data}
                      alt="Original"
                      className="max-w-full max-h-40 object-contain"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Monochrome</span>
                  <div className="border border-gray-200 rounded bg-white flex items-center justify-center p-2">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt="Monochrome preview"
                        className="max-w-full max-h-40 object-contain [image-rendering:pixelated]"
                      />
                    ) : (
                      <div className="text-xs text-gray-400">Processing...</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400">
                {originalWidth} &times; {originalHeight} px
              </div>

              {/* Controls */}
              <div className="space-y-2">
                <label>
                  <span className="text-xs text-gray-500">Monochrome Method</span>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as MonochromeMethod)}
                    className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="threshold">Closest Color</option>
                    <option value="dither">Dither (Floyd-Steinberg)</option>
                  </select>
                </label>

                {method === 'threshold' && (
                  <label>
                    <span className="text-xs text-gray-500">Threshold ({threshold})</span>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value))}
                      className="w-full mt-0.5"
                    />
                  </label>
                )}

                <label className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={invert}
                    onChange={(e) => setInvert(e.target.checked)}
                  />
                  <span className="text-xs text-gray-500">Invert</span>
                </label>
              </div>

              <button
                onClick={() => {
                  setData('');
                  setPreview('');
                  setOriginalWidth(0);
                  setOriginalHeight(0);
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Choose a different image
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!data || isProcessing}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
