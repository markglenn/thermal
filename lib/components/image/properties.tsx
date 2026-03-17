'use client';

import { useState } from 'react';
import type { ImageProperties as ImagePropsType, MonochromeMethod } from '@/lib/types';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { ImageUploadModal } from '@/components/image-upload/ImageUploadModal';
import { Upload, Replace, Trash2 } from 'lucide-react';
import { convertImageToMonochrome, generateMonochromePreview } from './convert';

interface Props {
  componentId: string;
  props: ImagePropsType;
}

export function ImagePropertiesPanel({ componentId, props }: Props) {
  const updateProperties = useEditorStoreContext((s) => s.updateProperties);
  const updateConstraints = useEditorStoreContext((s) => s.updateConstraints);
  const storeApi = useEditorStoreApi();
  const [showModal, setShowModal] = useState(false);

  const hasImage = !!props.data;

  const updateMonochrome = async (changes: Partial<Pick<ImagePropsType, 'threshold' | 'invert' | 'monochromeMethod'>>) => {
    const newThreshold = changes.threshold ?? props.threshold;
    const newInvert = changes.invert ?? props.invert;
    const newMethod = changes.monochromeMethod ?? props.monochromeMethod;

    updateProperties(componentId, { ...changes });

    if (props.data) {
      const comp = findComponent(storeApi.getState().document.components, componentId);
      const zplWidth = comp?.constraints.width ?? props.originalWidth;
      const zplHeight = comp?.constraints.height ?? props.originalHeight;

      const [result, preview, previewFull] = await Promise.all([
        convertImageToMonochrome(
          props.data,
          zplWidth,
          zplHeight,
          newThreshold,
          newInvert,
          newMethod
        ),
        generateMonochromePreview(
          props.data,
          zplWidth,
          zplHeight,
          newThreshold,
          newInvert,
          newMethod
        ),
        generateMonochromePreview(
          props.data,
          props.originalWidth,
          props.originalHeight,
          newThreshold,
          newInvert,
          newMethod
        ),
      ]);
      updateProperties(componentId, {
        monochromePreview: preview,
        monochromePreviewFull: previewFull,
        zplHex: result.hex,
        zplBytesPerRow: result.bytesPerRow,
        zplWidth: result.width,
        zplHeight: result.height,
      });
    }
  };

  return (
    <div className="p-3 border-b border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Image</h3>
        {hasImage && (
          <span className="text-xs text-gray-400">{props.originalWidth} &times; {props.originalHeight}</span>
        )}
      </div>
      <div className="space-y-2">
        {hasImage && (
          <div className="border border-gray-200 rounded p-1 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)_0_0/12px_12px]">
            <img
              src={props.monochromePreviewFull || props.data}
              alt="Component image"
              className="max-w-full max-h-24 object-contain mx-auto block"
            />
          </div>
        )}

        {hasImage ? (
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 px-2 py-1.5 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 flex items-center justify-center gap-1"
            >
              <Replace size={12} />
              Change
            </button>
            <button
              onClick={() => {
                if (!window.confirm('Remove this image?')) return;
                updateProperties(componentId, {
                  data: '',
                  originalWidth: 100,
                  originalHeight: 100,
                  monochromePreview: '',
                  monochromePreviewFull: '',
                  zplHex: '',
                  zplBytesPerRow: 0,
                  zplWidth: 0,
                  zplHeight: 0,
                });
                updateConstraints(componentId, { width: 100, height: 100 });
              }}
              className="flex-1 px-2 py-1.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 flex items-center justify-center gap-1"
            >
              <Trash2 size={12} />
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-full px-2 py-1.5 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 flex items-center justify-center gap-1"
          >
            <Upload size={12} />
            Upload Image
          </button>
        )}

        {hasImage && (
          <>
            <label>
              <span className="text-xs text-gray-500">Monochrome Method</span>
              <select
                value={props.monochromeMethod}
                onChange={(e) => updateMonochrome({ monochromeMethod: e.target.value as MonochromeMethod })}
                className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="threshold">Closest Color</option>
                <option value="dither">Dither (Floyd-Steinberg)</option>
              </select>
            </label>

            {props.monochromeMethod === 'threshold' && (
              <label>
                <span className="text-xs text-gray-500">Threshold ({props.threshold})</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={props.threshold}
                  onChange={(e) => updateMonochrome({ threshold: parseInt(e.target.value) })}
                  className="w-full mt-0.5"
                />
              </label>
            )}

            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={props.invert}
                onChange={(e) => updateMonochrome({ invert: e.target.checked })}
              />
              <span className="text-xs text-gray-500">Invert</span>
            </label>

          </>
        )}
      </div>

      {showModal && (
        <ImageUploadModal
          initialProps={hasImage ? props : undefined}
          onConfirm={(result) => {
            updateProperties(componentId, result);
            const comp = findComponent(storeApi.getState().document.components, componentId);
            const currentWidth = comp?.constraints.width;
            const currentHeight = comp?.constraints.height;
            // If component is still at default 200x200 (no prior image), resize to image dimensions
            if (currentWidth === 100 && currentHeight === 100 && !props.data) {
              updateConstraints(componentId, {
                width: result.originalWidth,
                height: result.originalHeight,
              });
            }
            setShowModal(false);
          }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
