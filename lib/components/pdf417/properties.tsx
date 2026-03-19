'use client';

import type { Pdf417Properties as Pdf417PropsType } from '@/lib/types';
import { useEditorStoreContext, usePauseTracking, useResumeTracking } from '@/lib/store/editor-context';
import { NumberInput } from '@/components/properties/NumberInput';

interface Props {
  componentId: string;
  props: Pdf417PropsType;
}

export function Pdf417PropertiesPanel({ componentId, props }: Props) {
  const updateProperties = useEditorStoreContext((s) => s.updateProperties);
  const pauseTracking = usePauseTracking();
  const resumeTracking = useResumeTracking();
  const update = (changes: Partial<Pdf417PropsType>) => updateProperties(componentId, changes);

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">PDF417</h3>
      <div className="space-y-2">
        <label>
          <span className="text-xs text-gray-500">Content</span>
          <input
            value={props.content}
            onChange={(e) => update({ content: e.target.value })}
            onFocus={pauseTracking}
            onBlur={resumeTracking}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="text-xs text-gray-500">Columns</span>
            <NumberInput value={props.columns} onChange={(v) => update({ columns: v })} min={1} max={30} fallback={3} />
          </label>
          <label className="flex-1">
            <span className="text-xs text-gray-500">Row Height</span>
            <NumberInput value={props.rowHeight} onChange={(v) => update({ rowHeight: v })} min={1} max={20} fallback={5} />
          </label>
        </div>
        <label>
          <span className="text-xs text-gray-500">Security Level ({props.securityLevel})</span>
          <input
            type="range"
            min={0}
            max={8}
            step={1}
            value={props.securityLevel}
            onChange={(e) => update({ securityLevel: parseInt(e.target.value) })}
            className="w-full mt-1"
          />
        </label>
      </div>
    </div>
  );
}
