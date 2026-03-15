'use client';

import type { LabelComponent } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';
import { NumberInput } from './NumberInput';

interface Props {
  componentId: string;
  component: LabelComponent;
}

export function BoxProperties({ componentId, component }: Props) {
  const updateProperties = useEditorStore((s) => s.updateProperties);

  if (component.typeData.type === 'rectangle') {
    const props = component.typeData.props;
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

  if (component.typeData.type === 'line') {
    const props = component.typeData.props;
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

  return null;
}
