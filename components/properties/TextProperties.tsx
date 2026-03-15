'use client';

import type { TextProperties as TextPropsType, ZplFont, Rotation } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';

interface Props {
  componentId: string;
  props: TextPropsType;
}

export function TextProperties({ componentId, props }: Props) {
  const updateProperties = useEditorStore((s) => s.updateProperties);
  const update = (changes: Partial<TextPropsType>) => updateProperties(componentId, changes);

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Text</h3>
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
            <span className="text-xs text-gray-500">Font</span>
            <select
              value={props.font}
              onChange={(e) => update({ font: e.target.value as ZplFont })}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            >
              {['0', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((f) => (
                <option key={f} value={f}>Font {f}</option>
              ))}
            </select>
          </label>
          <label className="flex-1">
            <span className="text-xs text-gray-500">Size</span>
            <input
              type="number"
              min={10}
              max={300}
              value={props.fontSize}
              onChange={(e) => update({ fontSize: parseInt(e.target.value) || 30 })}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </label>
        </div>
        <label>
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
    </div>
  );
}
