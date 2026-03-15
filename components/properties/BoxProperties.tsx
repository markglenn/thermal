'use client';

import type { LabelComponent } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';

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
            <input
              type="number"
              min={1}
              max={50}
              value={props.borderThickness}
              onChange={(e) => updateProperties(componentId, { borderThickness: parseInt(e.target.value) || 1 })}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </label>
          <label>
            <span className="text-xs text-gray-500">Corner Radius</span>
            <input
              type="number"
              min={0}
              max={20}
              value={props.cornerRadius}
              onChange={(e) => updateProperties(componentId, { cornerRadius: parseInt(e.target.value) || 0 })}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            />
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
            <input
              type="number"
              min={1}
              max={20}
              value={props.thickness}
              onChange={(e) => updateProperties(componentId, { thickness: parseInt(e.target.value) || 1 })}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            />
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
