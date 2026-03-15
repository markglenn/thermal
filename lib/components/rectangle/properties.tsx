'use client';

import type { RectangleProperties } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';
import { NumberInput } from '@/components/properties/NumberInput';

interface Props {
  componentId: string;
  props: RectangleProperties;
}

export function RectanglePropertiesPanel({ componentId, props }: Props) {
  const updateProperties = useEditorStore((s) => s.updateProperties);

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rectangle</h3>
      <div className="space-y-2">
        <label>
          <span className="text-xs text-gray-500">Border Thickness</span>
          <NumberInput value={props.borderThickness} onChange={(v) => updateProperties(componentId, { borderThickness: v })} min={1} max={50} fallback={1} />
        </label>
        <label>
          <span className="text-xs text-gray-500">Corner Radius</span>
          <NumberInput value={props.cornerRadius} onChange={(v) => updateProperties(componentId, { cornerRadius: v })} min={0} max={20} fallback={0} />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={props.filled}
            onChange={(e) => updateProperties(componentId, { filled: e.target.checked })}
          />
          <span className="text-xs text-gray-500">Filled</span>
        </label>
      </div>
    </div>
  );
}
