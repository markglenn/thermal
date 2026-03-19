'use client';

import type { QrCodeProperties as QrCodePropsType, QrErrorCorrection } from '@/lib/types';
import { useEditorStoreContext, usePauseTracking, useResumeTracking } from '@/lib/store/editor-context';
import { NumberInput } from '@/components/properties/NumberInput';

interface Props {
  componentId: string;
  props: QrCodePropsType;
}

export function QrCodeProperties({ componentId, props }: Props) {
  const updateProperties = useEditorStoreContext((s) => s.updateProperties);
  const pauseTracking = usePauseTracking();
  const resumeTracking = useResumeTracking();
  const update = (changes: Partial<QrCodePropsType>) => updateProperties(componentId, changes);

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
          <span className="text-xs text-gray-500">Size ({props.magnification})</span>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={props.magnification}
            onChange={(e) => update({ magnification: parseInt(e.target.value) })}
            className="w-full mt-1"
          />
        </label>
        <label>
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
  );
}
