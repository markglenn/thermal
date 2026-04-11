'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ImageProperties, MonochromeMethod } from '@/lib/types';
import { useImageUpload } from '@/hooks/use-image-upload';

interface Props {
  initialProps?: Partial<ImageProperties>;
  onConfirm: (result: Omit<ImageProperties, never>) => void;
  onCancel: () => void;
}

export function ImageUploadModal({ initialProps, onConfirm, onCancel }: Props) {
  const img = useImageUpload({ initialProps });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = async () => {
    const result = await img.confirm();
    if (result) onConfirm(result);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-white rounded-lg shadow-xl w-130 max-h-[90vh] flex flex-col overflow-hidden">
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
          {!img.data ? (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  img.setIsDragOver(true);
                }}
                onDragLeave={() => img.setIsDragOver(false)}
                onDrop={img.handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  img.isDragOver
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
                    if (file) img.loadImageFile(file);
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
                  if (img.urlInput.trim()) img.loadImageUrl(img.urlInput.trim());
                }}
                className="flex gap-1.5"
              >
                <input
                  type="url"
                  value={img.urlInput}
                  onChange={(e) => img.setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
                <button
                  type="submit"
                  disabled={!img.urlInput.trim() || img.urlLoading}
                  className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50 disabled:opacity-50"
                >
                  {img.urlLoading ? 'Loading...' : 'Fetch'}
                </button>
              </form>
              {img.urlError && (
                <p className="text-xs text-red-500">{img.urlError}</p>
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
                      src={img.data}
                      alt="Original"
                      className="max-w-full max-h-40 object-contain"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Monochrome</span>
                  <div className="border border-gray-200 rounded bg-white flex items-center justify-center p-2">
                    {img.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.preview}
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
                {img.originalWidth} &times; {img.originalHeight} px
              </div>

              {/* Controls */}
              <div className="space-y-2">
                <label>
                  <span className="text-xs text-gray-500">Monochrome Method</span>
                  <select
                    value={img.method}
                    onChange={(e) => img.setMethod(e.target.value as MonochromeMethod)}
                    className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="threshold">Closest Color</option>
                    <option value="dither">Dither (Floyd-Steinberg)</option>
                    <option value="ordered">Dither (Ordered)</option>
                  </select>
                </label>

                {(img.method === 'threshold' || img.method === 'ordered') && (
                  <label>
                    <span className="text-xs text-gray-500">Threshold ({img.threshold})</span>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      value={img.threshold}
                      onChange={(e) => img.setThreshold(parseInt(e.target.value))}
                      className="w-full mt-0.5"
                    />
                  </label>
                )}

                <label className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={img.invert}
                    onChange={(e) => img.setInvert(e.target.checked)}
                  />
                  <span className="text-xs text-gray-500">Invert</span>
                </label>
              </div>

              <button
                onClick={img.reset}
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
            disabled={!img.data || img.isProcessing}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            {img.isProcessing ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
