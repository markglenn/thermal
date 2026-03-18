'use client';

import { useMemo } from 'react';
import type { LabelComponent, HorizontalAnchor, VerticalAnchor } from '@/lib/types';
import { useEditorStoreContext } from '@/lib/store/editor-context';
import { getSizingMode } from '@/lib/components';
import { useDocument } from '@/lib/store/editor-context';
import { resolveDocument } from '@/lib/constraints/resolver';
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
  { horizontal: 'right', vertical: 'top', position: 'top-right' },
  { horizontal: 'left', vertical: 'bottom', position: 'bottom-left' },
  { horizontal: 'right', vertical: 'bottom', position: 'bottom-right' },
];

const DOT_POSITIONS: Record<string, string> = {
  'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
  'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
  'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
  'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
};

function AnchorPicker({
  horizontal,
  vertical,
  onChange,
}: {
  horizontal: HorizontalAnchor;
  vertical: VerticalAnchor;
  onChange: (h: HorizontalAnchor, v: VerticalAnchor) => void;
}) {
  return (
    <div className="relative w-16 h-10 border-2 border-gray-300 rounded bg-gray-50">
      {/* Crosshair lines */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-gray-200" />
      </div>
      <div className="absolute inset-0 flex justify-center">
        <div className="h-full w-px bg-gray-200" />
      </div>
      {/* Corner dots */}
      {ANCHOR_CORNERS.map((corner) => {
        const isActive = corner.horizontal === horizontal && corner.vertical === vertical;
        return (
          <button
            key={corner.position}
            onClick={() => onChange(corner.horizontal, corner.vertical)}
            className={`absolute ${DOT_POSITIONS[corner.position]} w-3 h-3 rounded-full border-2 transition-all ${
              isActive
                ? 'bg-blue-500 border-blue-600 scale-110'
                : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
            title={`Anchor ${corner.position.replace('-', ' ')}`}
          />
        );
      })}
    </div>
  );
}

export function ConstraintEditor({ component }: Props) {
  const updateLayout = useEditorStoreContext((s) => s.updateLayout);
  const setAnchor = useEditorStoreContext((s) => s.setAnchor);
  const doc = useDocument();

  const layout = component.layout;

  const boundsMap = useMemo(() => resolveDocument(doc), [doc]);
  const bounds = boundsMap.get(component.id);
  const w = Math.round(bounds?.width ?? layout.width);
  const h = Math.round(bounds?.height ?? layout.height);

  const sizingMode = getSizingMode(component);
  const isAutoSized = sizingMode === 'auto';
  const isWidthOnly = sizingMode === 'width-only';

  const setX = (val: number) => updateLayout(component.id, { x: val });
  const setY = (val: number) => updateLayout(component.id, { y: val });
  const setW = (val: number) => updateLayout(component.id, { width: val });
  const setH = (val: number) => updateLayout(component.id, { height: val });

  return (
    <div className="p-3 border-b border-gray-200">
      {/* Position */}
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Position</h3>
      <div className="grid grid-cols-4 gap-1 mb-3">
        <label className="flex items-center gap-1 col-span-2">
          <span className="text-xs text-gray-500 shrink-0">X</span>
          <NumberInput
            value={Math.round(layout.x)}
            onChange={setX}
            fallback={0}
            className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs"
          />
        </label>
        <label className="flex items-center gap-1 col-span-2">
          <span className="text-xs text-gray-500 shrink-0">Y</span>
          <NumberInput
            value={Math.round(layout.y)}
            onChange={setY}
            fallback={0}
            className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs"
          />
        </label>
      </div>

      {/* Size */}
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Size</h3>
      <div className="grid grid-cols-4 gap-1 mb-3">
        <label className="flex items-center gap-1 col-span-2">
          <span className="text-xs text-gray-500 shrink-0">W</span>
          {isAutoSized ? (
            <span className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs text-gray-400 bg-gray-50">
              {w}
            </span>
          ) : (
            <NumberInput value={w} onChange={setW} fallback={100} min={1} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
          )}
        </label>
        <label className="flex items-center gap-1 col-span-2">
          <span className="text-xs text-gray-500 shrink-0">H</span>
          {isAutoSized || isWidthOnly ? (
            <span className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs text-gray-400 bg-gray-50">
              {h}
            </span>
          ) : (
            <NumberInput value={h} onChange={setH} fallback={40} min={1} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
          )}
        </label>
      </div>

      {/* Anchor */}
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Anchor</h3>
      <AnchorPicker
        horizontal={layout.horizontalAnchor}
        vertical={layout.verticalAnchor}
        onChange={(h, v) => setAnchor(component.id, h, v)}
      />
    </div>
  );
}
