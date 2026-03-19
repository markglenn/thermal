'use client';

import type { DataMatrixProperties as DataMatrixPropsType } from '@/lib/types';
import { useEditorStoreContext, usePauseTracking, useResumeTracking } from '@/lib/store/editor-context';

interface Props {
  componentId: string;
  props: DataMatrixPropsType;
}

export function DataMatrixPropertiesPanel({ componentId, props }: Props) {
  const updateProperties = useEditorStoreContext((s) => s.updateProperties);
  const pauseTracking = usePauseTracking();
  const resumeTracking = useResumeTracking();
  const update = (changes: Partial<DataMatrixPropsType>) => updateProperties(componentId, changes);

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Data Matrix</h3>
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
        <label>
          <span className="text-xs text-gray-500">Module Size ({props.moduleSize})</span>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={props.moduleSize}
            onChange={(e) => update({ moduleSize: parseInt(e.target.value) })}
            className="w-full mt-1"
          />
        </label>
      </div>
    </div>
  );
}
