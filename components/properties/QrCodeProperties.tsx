'use client';

import type { QrCodeProperties as QrCodePropsType, QrErrorCorrection } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';

interface Props {
  componentId: string;
  props: QrCodePropsType;
}

export function QrCodeProperties({ componentId, props }: Props) {
  const updateProperties = useEditorStore((s) => s.updateProperties);
  const update = (changes: Partial<QrCodePropsType>) => updateProperties(componentId, changes);

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">QR Code</h3>
      <div className="space-y-2">
        <label>
          <span className="text-xs text-gray-500">Content</span>
          <input
            value={props.content}
            onChange={(e) => update({ content: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="text-xs text-gray-500">Magnification</span>
            <input
              type="number"
              min={1}
              max={10}
              value={props.magnification}
              onChange={(e) => update({ magnification: parseInt(e.target.value) || 5 })}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="text-xs text-gray-500">Error Correction</span>
            <select
              value={props.errorCorrection}
              onChange={(e) => update({ errorCorrection: e.target.value as QrErrorCorrection })}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="L">L (7%)</option>
              <option value="M">M (15%)</option>
              <option value="Q">Q (25%)</option>
              <option value="H">H (30%)</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
