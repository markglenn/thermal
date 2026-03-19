'use client';

import { useMemo } from 'react';
import type { LabelComponent, HorizontalAnchor, VerticalAnchor } from '@/lib/types';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { getDefinition, getSizingMode } from '@/lib/components';
import { useDocument } from '@/lib/store/editor-context';
import { resolveDocument } from '@/lib/constraints/resolver';
import { reconvertImageAtBounds } from '@/lib/components/image/reconvert';
import { NumberInput } from './NumberInput';

interface Props {
  component: LabelComponent;
}

const ANCHOR_CORNERS: {
  horizontal: HorizontalAnchor;
  vertical: VerticalAnchor;
  position: string;
}[] = [
  { horizontal: 'left', vertical: 'top', position: 'top-left' },
  { horizontal: 'center', vertical: 'top', position: 'top-center' },
  { horizontal: 'right', vertical: 'top', position: 'top-right' },
  { horizontal: 'left', vertical: 'bottom', position: 'bottom-left' },
  { horizontal: 'center', vertical: 'bottom', position: 'bottom-center' },
  { horizontal: 'right', vertical: 'bottom', position: 'bottom-right' },
];

const DOT_POSITIONS: Record<string, string> = {
  'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
  'top-center': 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
  'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
  'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
  'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
};

export function ConstraintEditor({ component }: Props) {
  const updateLayout = useEditorStoreContext((s) => s.updateLayout);
  const setAnchor = useEditorStoreContext((s) => s.setAnchor);
  const storeApi = useEditorStoreApi();
  const doc = useDocument();

  const layout = component.layout;
  const hAnchor = layout.horizontalAnchor;
  const vAnchor = layout.verticalAnchor;

  const boundsMap = useMemo(() => resolveDocument(doc), [doc]);
  const bounds = boundsMap.get(component.id);
  const w = Math.round(bounds?.width ?? layout.width);
  const h = Math.round(bounds?.height ?? layout.height);

  const def = getDefinition(component.typeData.type);
  const sizingMode = getSizingMode(component);
  const isAutoSized = sizingMode === 'auto';
  const isWidthOnly = sizingMode === 'width-only';

  const setX = (val: number) => updateLayout(component.id, { x: val });
  const setY = (val: number) => updateLayout(component.id, { y: val });
  const setW = (val: number) => {
    const size = def.constrainSize
      ? def.constrainSize(component.typeData.props, layout, { width: val })
      : { width: val };
    updateLayout(component.id, size);
    reconvertImageAtBounds(component.id, storeApi);
  };
  const setH = (val: number) => {
    const size = def.constrainSize
      ? def.constrainSize(component.typeData.props, layout, { height: val })
      : { height: val };
    updateLayout(component.id, size);
    reconvertImageAtBounds(component.id, storeApi);
  };

  const offsetInput = (value: number, onChange: (v: number) => void) => (
    <NumberInput
      value={Math.round(value)}
      onChange={onChange}
      fallback={0}
      className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
    />
  );

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Position & Anchor</h3>

      {/* Spatial layout: inputs on the anchored edges */}
      <div className="flex flex-col items-center gap-1.5 mb-4">
        {/* Top offset — only shown when top-anchored */}
        <div className="h-6 flex items-center">
          {vAnchor === 'top' && offsetInput(layout.y, setY)}
        </div>

        {/* Middle row: left offset — rectangle — right offset */}
        <div className="flex items-center gap-1.5">
          <div className="w-12 flex justify-end">
            {hAnchor === 'left' && offsetInput(layout.x, setX)}
          </div>

          {/* The label rectangle with anchor dots */}
          <div className="relative w-20 h-14 border-2 border-gray-300 rounded bg-gray-50 shrink-0">
            {/* Crosshair lines */}
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gray-200" />
            </div>
            <div className="absolute inset-0 flex justify-center">
              <div className="h-full w-px bg-gray-200" />
            </div>
            {/* Size display in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] text-gray-400 font-mono">{w}×{h}</span>
            </div>
            {/* Corner dots */}
            {ANCHOR_CORNERS.map((corner) => {
              const isActive = corner.horizontal === hAnchor && corner.vertical === vAnchor;
              return (
                <button
                  key={corner.position}
                  onClick={() => setAnchor(component.id, corner.horizontal, corner.vertical)}
                  className={`absolute ${DOT_POSITIONS[corner.position]} w-3 h-3 rounded-full border-2 transition-all z-10 ${
                    isActive
                      ? 'bg-blue-500 border-blue-600 scale-110'
                      : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                  title={`Anchor ${corner.position.replace('-', ' ')}`}
                />
              );
            })}
          </div>

          <div className="w-12">
            {hAnchor === 'right' && offsetInput(layout.x, setX)}
          </div>
        </div>

        {/* Bottom offset — only shown when bottom-anchored */}
        <div className="h-6 flex items-center">
          {vAnchor === 'bottom' && offsetInput(layout.y, setY)}
        </div>
      </div>

      {/* Size — separate section for editable components */}
      {!isAutoSized && (
        <>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Size</h3>
          <div className="grid grid-cols-4 gap-1">
            <label className="flex items-center gap-1 col-span-2">
              <span className="text-xs text-gray-500 shrink-0">W</span>
              <NumberInput value={w} onChange={setW} fallback={100} min={1} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
            </label>
            <label className="flex items-center gap-1 col-span-2">
              <span className="text-xs text-gray-500 shrink-0">H</span>
              {isWidthOnly ? (
                <span className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs text-gray-400 bg-gray-50">
                  {h}
                </span>
              ) : (
                <NumberInput value={h} onChange={setH} fallback={40} min={1} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
              )}
            </label>
          </div>
        </>
      )}
    </div>
  );
}
