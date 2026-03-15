'use client';

import type { BarcodeProperties as BarcodePropsType, BarcodeEncoding, Rotation } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';
import { NumberInput } from './NumberInput';

interface Props {
  componentId: string;
  props: BarcodePropsType;
}

export function BarcodeProperties({ componentId, props }: Props) {
  const updateProperties = useEditorStore((s) => s.updateProperties);
  const update = (changes: Partial<BarcodePropsType>) => updateProperties(componentId, changes);

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Barcode</h3>
      <div className="space-y-2">
        <label>
          <span className="text-xs text-gray-500">Data</span>
          <input
            value={props.content}
            onChange={(e) => update({ content: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>
        <label>
          <span className="text-xs text-gray-500">Encoding</span>
          <select
            value={props.encoding}
            onChange={(e) => update({ encoding: e.target.value as BarcodeEncoding })}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="code128">Code 128</option>
            <option value="code39">Code 39</option>
            <option value="ean13">EAN-13</option>
            <option value="upca">UPC-A</option>
            <option value="itf">ITF</option>
          </select>
        </label>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="text-xs text-gray-500">Height</span>
            <NumberInput value={props.height} onChange={(v) => update({ height: v })} min={20} max={300} fallback={80} />
          </label>
          <label className="flex-1">
            <span className="text-xs text-gray-500">Rotation</span>
            <select
              value={props.rotation}
              onChange={(e) => update({ rotation: parseInt(e.target.value) as Rotation })}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={0}>0°</option>
              <option value={90}>90°</option>
              <option value={180}>180°</option>
              <option value={270}>270°</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={props.showText}
            onChange={(e) => update({ showText: e.target.checked })}
          />
          <span className="text-xs text-gray-500">Show text below barcode</span>
        </label>
      </div>
    </div>
  );
}
