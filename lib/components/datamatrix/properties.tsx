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
    <div className="px-3 pb-3">
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
