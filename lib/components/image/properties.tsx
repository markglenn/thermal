'use client';

import { useState } from 'react';
import type { ImageProperties as ImagePropsType, MonochromeMethod, ImageObjectFit, ImageObjectPosition } from '@/lib/types';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { ImageUploadModal } from '@/components/image-upload/ImageUploadModal';
import { Upload, Replace, Trash2 } from 'lucide-react';
import { convertImageToMonochrome, generateMonochromePreview } from './convert';
import { resolveImageLayout } from './fit';

interface Props {
  componentId: string;
  props: ImagePropsType;
}

const POSITION_DOTS: { position: ImageObjectPosition; className: string }[] = [
  { position: 'top-left',     className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2' },
  { position: 'top',          className: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' },
  { position: 'top-right',    className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2' },
  { position: 'left',         className: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2' },
  { position: 'center',       className: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' },
  { position: 'right',        className: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2' },
  { position: 'bottom-left',  className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2' },
  { position: 'bottom',       className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' },
  { position: 'bottom-right', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2' },
];

export function ImagePropertiesPanel({ componentId, props }: Props) {
  const updateProperties = useEditorStoreContext((s) => s.updateProperties);
  const updateLayout = useEditorStoreContext((s) => s.updateLayout);
  const storeApi = useEditorStoreApi();
  const [showModal, setShowModal] = useState(false);

  const hasImage = !!props.data;

  const getConversionDims = (overrides: Partial<ImagePropsType> = {}) => {
    const comp = findComponent(storeApi.getState().document.components, componentId);
    const boxWidth = comp?.layout.width ?? props.originalWidth;
    const boxHeight = comp?.layout.height ?? props.originalHeight;
    const fit = overrides.objectFit ?? props.objectFit;
    const pos = overrides.objectPosition ?? props.objectPosition;
    return resolveImageLayout(boxWidth, boxHeight, props.originalWidth, props.originalHeight, fit, pos);
  };

  const reconvert = async (overrides: Partial<ImagePropsType> = {}) => {
    if (!props.data) return;

    const newThreshold = overrides.threshold ?? props.threshold;
    const newInvert = overrides.invert ?? props.invert;
    const newMethod = overrides.monochromeMethod ?? props.monochromeMethod;
    const layout = getConversionDims(overrides);

    const [result, preview, previewFull] = await Promise.all([
      convertImageToMonochrome(props.data, layout.width, layout.height, newThreshold, newInvert, newMethod),
      generateMonochromePreview(props.data, layout.width, layout.height, newThreshold, newInvert, newMethod),
      generateMonochromePreview(props.data, props.originalWidth, props.originalHeight, newThreshold, newInvert, newMethod),
    ]);
    updateProperties(componentId, {
      monochromePreview: preview,
      monochromePreviewFull: previewFull,
      zplHex: result.hex,
      zplBytesPerRow: result.bytesPerRow,
      zplWidth: result.width,
      zplHeight: result.height,
    });
  };

  const updateAndReconvert = async (changes: Partial<ImagePropsType>) => {
    updateProperties(componentId, changes);
    await reconvert(changes);
  };

  return (
    <div className="px-3 pb-3">
      {hasImage && (
        <div className="flex justify-end mb-2">
          <span className="text-xs text-gray-400">{props.originalWidth} &times; {props.originalHeight}</span>
        </div>
      )}
      <div className="space-y-3">
        {hasImage && (
          <div className="border border-gray-200 rounded p-1 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)_0_0/12px_12px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  objectFit: 'fit',
                  objectPosition: 'center',
                  monochromePreview: '',
                  monochromePreviewFull: '',
                  zplHex: '',
                  zplBytesPerRow: 0,
                  zplWidth: 0,
                  zplHeight: 0,
                });
                updateLayout(componentId, { width: 100, height: 100 });
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
            {/* Object Fit */}
            <label>
              <span className="text-xs text-gray-500">Sizing</span>
              <select
                value={props.objectFit ?? 'fit'}
                onChange={(e) => updateAndReconvert({ objectFit: e.target.value as ImageObjectFit })}
                className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="fit">Fit (original size)</option>
                <option value="fill">Fill (proportional)</option>
                <option value="stretch">Stretch (distort)</option>
              </select>
            </label>

            {/* Object Position — dot picker, only for fit mode */}
            {(props.objectFit ?? 'fit') !== 'stretch' && (
              <div>
                <span className="text-xs text-gray-500">Image Position</span>
                <div className="flex justify-center mt-1">
                <div className="relative w-20 h-14 border-2 border-gray-300 rounded bg-gray-50">
                  {/* Crosshair lines */}
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-px bg-gray-200" />
                  </div>
                  <div className="absolute inset-0 flex justify-center">
                    <div className="h-full w-px bg-gray-200" />
                  </div>
                  {/* Position dots */}
                  {POSITION_DOTS.map((dot) => {
                    const currentPos = props.objectPosition ?? 'center';
                    const isActive = dot.position === currentPos;
                    return (
                      <button
                        key={dot.position}
                        onClick={() => updateAndReconvert({ objectPosition: dot.position })}
                        className={`absolute ${dot.className} w-3 h-3 rounded-full border-2 transition-all z-10 ${
                          isActive
                            ? 'bg-blue-500 border-blue-600 scale-110'
                            : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                        title={dot.position}
                      />
                    );
                  })}
                </div>
                </div>
              </div>
            )}

            {/* Monochrome Method */}
            <label>
              <span className="text-xs text-gray-500">Monochrome Method</span>
              <select
                value={props.monochromeMethod}
                onChange={(e) => updateAndReconvert({ monochromeMethod: e.target.value as MonochromeMethod })}
                className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="threshold">Closest Color</option>
                <option value="dither">Dither (Floyd-Steinberg)</option>
                <option value="ordered">Dither (Ordered)</option>
              </select>
            </label>

            {(props.monochromeMethod === 'threshold' || props.monochromeMethod === 'ordered') && (
              <label>
                <span className="text-xs text-gray-500">Threshold ({props.threshold})</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={props.threshold}
                  onChange={(e) => updateAndReconvert({ threshold: parseInt(e.target.value) })}
                  className="w-full mt-0.5"
                />
              </label>
            )}

            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                checked={props.invert}
                onChange={(e) => updateAndReconvert({ invert: e.target.checked })}
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
            const currentWidth = comp?.layout.width;
            const currentHeight = comp?.layout.height;
            // If component is still at default 100x100 (no prior image), resize to image dimensions
            if (currentWidth === 100 && currentHeight === 100 && !props.data) {
              updateLayout(componentId, {
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
