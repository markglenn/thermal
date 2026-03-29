'use client';

import { Link } from 'lucide-react';
import { useEditorStoreContext, useDocument, usePauseTracking, useResumeTracking } from '@/lib/store/editor-context';
import { resolveVariables } from '@/lib/variables/resolve';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { NumberInput } from './NumberInput';
import type { VariableType, CounterConfig, LabelVariable } from '@/lib/types';

const DEFAULT_COUNTER: CounterConfig = { start: 1, increment: 1, padding: 5, prefix: '', suffix: '' };

export function FieldBindingEditor({ componentId, binding }: { componentId: string; binding?: string }) {
  const updateFieldBinding = useEditorStoreContext((s) => s.updateFieldBinding);
  const addVariable = useEditorStoreContext((s) => s.addVariable);
  const updateVariable = useEditorStoreContext((s) => s.updateVariable);
  const removeVariable = useEditorStoreContext((s) => s.removeVariable);
  const doc = useDocument();
  const pauseTracking = usePauseTracking();
  const resumeTracking = useResumeTracking();

  const variables = doc.variables ?? [];
  const variable = binding ? variables.find((v) => v.name === binding) : undefined;
  const variableType = variable?.type ?? 'text';

  // Preview the resolved value
  const resolved = binding && variable ? resolveVariables([variable]) : {};
  const preview = binding ? resolved[binding] : undefined;

  const handleBindingChange = (value: string) => {
    const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, '').replace(/^[^a-zA-Z]+/, '');
    const oldBinding = binding;

    // Set the new binding (or clear it)
    updateFieldBinding(componentId, sanitized || undefined);

    // Auto-manage variables: remove old if no other component uses it
    if (oldBinding && oldBinding !== sanitized) {
      const otherUsesOld = doc.components.some(
        (c) => c.id !== componentId && c.fieldBinding === oldBinding
      );
      if (!otherUsesOld) {
        removeVariable(oldBinding);
      }
    }

    // Auto-create variable entry for date/counter types
    // (text type doesn't need an entry — content is the default)
    if (sanitized && !variables.some((v) => v.name === sanitized)) {
      // Only create if we had a non-text variable before (preserve type on rename)
      if (variable && variable.type !== 'text') {
        addVariable({ ...variable, name: sanitized });
      }
    }
  };

  const handleTypeChange = (type: VariableType) => {
    if (!binding) return;

    if (type === 'text') {
      // Text type doesn't need a variable entry — remove it
      removeVariable(binding);
    } else {
      const updates: Partial<LabelVariable> = { type };
      if (type === 'counter') updates.counter = { ...DEFAULT_COUNTER };
      if (type === 'date') updates.format = 'YYYY-MM-DD';

      if (variable) {
        updateVariable(binding, updates);
      } else {
        addVariable({ name: binding, type, defaultValue: '', ...updates });
      }
    }
  };

  const handleCounterUpdate = (updates: Partial<CounterConfig>) => {
    if (!binding || !variable?.counter) return;
    updateVariable(binding, { counter: { ...variable.counter, ...updates } });
  };

  return (
    <CollapsibleSection title="Field Binding" icon={<Link size={12} />}>
      <div className="px-3 pb-3 space-y-2">
        {/* Field name input */}
        <div>
          <input
            value={binding ?? ''}
            onChange={(e) => handleBindingChange(e.target.value)}
            onFocus={pauseTracking}
            onBlur={resumeTracking}
            placeholder="None"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
          />
        </div>

        {/* Type + config — shown when binding is set */}
        {binding && (
          <div className="space-y-2">
            <label className="block">
              <span className="text-[10px] text-gray-500">Type</span>
              <select
                value={variableType}
                onChange={(e) => handleTypeChange(e.target.value as VariableType)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="text">Text</option>
                <option value="date">Date</option>
                <option value="counter">Counter</option>
              </select>
            </label>

            {variableType === 'date' && (
              <label className="block">
                <span className="text-[10px] text-gray-500">Format</span>
                <input
                  value={variable?.format ?? 'YYYY-MM-DD'}
                  onChange={(e) => variable && updateVariable(binding, { format: e.target.value })}
                  onFocus={pauseTracking}
                  onBlur={resumeTracking}
                  placeholder="YYYY-MM-DD"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs font-mono"
                />
                <p className="text-[9px] text-gray-400 mt-0.5">YYYY, YY, MM, DD, HH, mm, ss</p>
              </label>
            )}

            {variableType === 'counter' && variable?.counter && (
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <label className="flex-1">
                    <span className="text-[10px] text-gray-500">Start</span>
                    <NumberInput value={variable.counter.start} onChange={(val) => handleCounterUpdate({ start: val })} fallback={1} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px] text-gray-500">Step</span>
                    <NumberInput value={variable.counter.increment} onChange={(val) => handleCounterUpdate({ increment: val })} fallback={1} min={1} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px] text-gray-500">Pad</span>
                    <NumberInput value={variable.counter.padding} onChange={(val) => handleCounterUpdate({ padding: val })} fallback={0} min={0} max={20} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
                  </label>
                </div>
                <div className="flex gap-1.5">
                  <label className="flex-1">
                    <span className="text-[10px] text-gray-500">Prefix</span>
                    <input
                      value={variable.counter.prefix}
                      onChange={(e) => handleCounterUpdate({ prefix: e.target.value })}
                      onFocus={pauseTracking}
                      onBlur={resumeTracking}
                      className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs font-mono"
                    />
                  </label>
                  <label className="flex-1">
                    <span className="text-[10px] text-gray-500">Suffix</span>
                    <input
                      value={variable.counter.suffix}
                      onChange={(e) => handleCounterUpdate({ suffix: e.target.value })}
                      onFocus={pauseTracking}
                      onBlur={resumeTracking}
                      className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs font-mono"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preview resolved value for date/counter */}
        {binding && preview && variableType !== 'text' && (
          <div className="text-[10px] text-gray-400">
            Preview: <span className="font-mono">{preview}</span>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
