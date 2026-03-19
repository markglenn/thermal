'use client';

import type { TextProperties as TextPropsType, ZplFont, Rotation, TextJustification, FieldBlockProperties } from '@/lib/types';
import { useEditorStoreContext, usePauseTracking, useResumeTracking } from '@/lib/store/editor-context';
import { NumberInput } from '@/components/properties/NumberInput';

interface Props {
  componentId: string;
  props: TextPropsType;
}

export function TextProperties({ componentId, props }: Props) {
  const updateProperties = useEditorStoreContext((s) => s.updateProperties);
  const updateLayout = useEditorStoreContext((s) => s.updateLayout);
  const pauseTracking = usePauseTracking();
  const resumeTracking = useResumeTracking();
  const update = (changes: Partial<TextPropsType>) => updateProperties(componentId, changes);

  const fb = props.fieldBlock;
  const hasFieldBlock = !!fb;

  const toggleFieldBlock = () => {
    if (hasFieldBlock) {
      update({ fieldBlock: undefined });
    } else {
      update({
        fieldBlock: { maxLines: 3, lineSpacing: 0, justification: 'L' },
      });
      updateLayout(componentId, { width: 200 });
    }
  };

  const updateFieldBlock = (changes: Partial<FieldBlockProperties>) => {
    if (!fb) return;
    update({ fieldBlock: { ...fb, ...changes } });
  };

  return (
    <div className="px-3 pb-3">
      <div className="space-y-2">
        <label>
          <span className="text-xs text-gray-500">Content</span>
          {hasFieldBlock ? (
            <textarea
              value={props.content}
              onChange={(e) => update({ content: e.target.value })}
              onFocus={pauseTracking}
              onBlur={resumeTracking}
              rows={3}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm resize-y"
            />
          ) : (
            <input
              value={props.content}
              onChange={(e) => update({ content: e.target.value })}
              onFocus={pauseTracking}
              onBlur={resumeTracking}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          )}
        </label>
        <label>
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
        <div className="grid grid-cols-4 gap-2 mt-1">
          <label className="flex items-center gap-1 col-span-2">
            <span className="text-xs text-gray-500 shrink-0">H</span>
            <NumberInput value={props.fontSize} onChange={(v) => update({ fontSize: v })} min={10} max={300} fallback={30} />
          </label>
          <label className="flex items-center gap-1 col-span-2">
            <span className="text-xs text-gray-500 shrink-0">W</span>
            <NumberInput value={props.fontWidth} onChange={(v) => update({ fontWidth: v })} min={10} max={300} fallback={30} />
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

        {/* Field Block */}
        <div className="pt-1 border-t border-gray-100">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hasFieldBlock}
              onChange={toggleFieldBlock}
            />
            <span className="text-xs text-gray-500">Field Block (multi-line)</span>
          </label>
        </div>

        {hasFieldBlock && fb && (
          <div className="space-y-2 pl-1 border-l-2 border-blue-200 ml-1">
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-xs text-gray-500">Max Lines</span>
                <NumberInput value={fb.maxLines} onChange={(v) => updateFieldBlock({ maxLines: v })} min={1} max={99} fallback={3} />
              </label>
            </div>
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-xs text-gray-500">Justify</span>
                <select
                  value={fb.justification}
                  onChange={(e) => updateFieldBlock({ justification: e.target.value as TextJustification })}
                  className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="L">Left</option>
                  <option value="C">Center</option>
                  <option value="R">Right</option>
                  <option value="J">Justify</option>
                </select>
              </label>
              <label className="flex-1">
                <span className="text-xs text-gray-500">Line Spacing</span>
                <NumberInput value={fb.lineSpacing} onChange={(v) => updateFieldBlock({ lineSpacing: v })} min={-20} max={100} fallback={0} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
