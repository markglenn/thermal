'use client';

import { Eye } from 'lucide-react';
import { useEditorStoreContext, usePauseTracking, useResumeTracking } from '@/lib/store/editor-context';
import { CONDITION_OPERATORS } from '@/lib/utils';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { VisibilityCondition, ConditionOperator } from '@/lib/types';

export function VisibilityConditionEditor({ componentId, condition }: { componentId: string; condition?: VisibilityCondition }) {
  const updateVisibilityCondition = useEditorStoreContext((s) => s.updateVisibilityCondition);
  const pauseTracking = usePauseTracking();
  const resumeTracking = useResumeTracking();

  const isConditional = !!condition;
  const operator = CONDITION_OPERATORS.find((o) => o.value === condition?.operator) ?? CONDITION_OPERATORS[0];

  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      updateVisibilityCondition(componentId, { field: '', operator: 'isNotEmpty' });
    } else {
      updateVisibilityCondition(componentId, undefined);
    }
  };

  const handleFieldChange = (field: string) => {
    if (!condition) return;
    const sanitized = field.replace(/[^a-zA-Z0-9_-]/g, '').replace(/^[^a-zA-Z]+/, '');
    updateVisibilityCondition(componentId, { ...condition, field: sanitized });
  };

  const handleOperatorChange = (op: ConditionOperator) => {
    if (!condition) return;
    updateVisibilityCondition(componentId, { ...condition, operator: op });
  };

  const handleValueChange = (value: string) => {
    if (!condition) return;
    updateVisibilityCondition(componentId, { ...condition, value });
  };

  return (
    <CollapsibleSection title="Visibility" icon={<Eye size={12} />}>
      <div className="px-3 pb-3 space-y-2">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="radio"
              name={`vis-${componentId}`}
              checked={!isConditional}
              onChange={() => handleToggle(false)}
              className="accent-gray-600"
            />
            Always visible
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="radio"
              name={`vis-${componentId}`}
              checked={isConditional}
              onChange={() => handleToggle(true)}
              className="accent-gray-600"
            />
            Show when...
          </label>
        </div>

        {isConditional && condition && (
          <div className="space-y-1.5">
            <input
              value={condition.field}
              onChange={(e) => handleFieldChange(e.target.value)}
              onFocus={pauseTracking}
              onBlur={resumeTracking}
              placeholder="field name"
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
            />
            <select
              value={condition.operator}
              onChange={(e) => handleOperatorChange(e.target.value as ConditionOperator)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            >
              {CONDITION_OPERATORS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {operator.needsValue && (
              <input
                value={condition.value ?? ''}
                onChange={(e) => handleValueChange(e.target.value)}
                onFocus={pauseTracking}
                onBlur={resumeTracking}
                placeholder="value"
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
              />
            )}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
