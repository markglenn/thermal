'use client';

import type { LineProperties } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';
import { NumberInput } from '@/components/properties/NumberInput';

interface Props {
  componentId: string;
  props: LineProperties;
}

export function LinePropertiesPanel({ componentId, props }: Props) {
  const updateProperties = useEditorStore((s) => s.updateProperties);

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Line</h3>
      <div className="space-y-2">
        <label>
          <span className="text-xs text-gray-500">Thickness</span>
          <NumberInput value={props.thickness} onChange={(v) => updateProperties(componentId, { thickness: v })} min={1} max={20} fallback={1} />
        </label>
        <label>
          <span className="text-xs text-gray-500">Orientation</span>
          <select
            value={props.orientation}
            onChange={(e) => updateProperties(componentId, { orientation: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
      </div>
    </div>
  );
}
