'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Variable } from 'lucide-react';
import { useEditorStoreContext, usePauseTracking, useResumeTracking } from '@/lib/store/editor-context';
import { useDocument } from '@/lib/store/editor-context';
import { resolveVariables } from '@/lib/variables/resolve';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { NumberInput } from './NumberInput';
import type { LabelVariable, VariableType, CounterConfig } from '@/lib/types';

const DEFAULT_COUNTER: CounterConfig = { start: 1, increment: 1, padding: 5, prefix: '', suffix: '' };

function VariableNameInput({ name, onRename, onFocus, onBlur }: {
  name: string;
  onRename: (newName: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const [draft, setDraft] = useState(name);

  useEffect(() => { setDraft(name); }, [name]);

  const sanitize = (val: string) => val.replace(/[^a-zA-Z0-9_-]/g, '').replace(/^[^a-zA-Z]+/, '');

  const commit = () => {
    const sanitized = sanitize(draft);
    if (sanitized && sanitized !== name) {
      onRename(sanitized);
    } else {
      setDraft(name); // revert to current name if empty or unchanged
    }
    onBlur();
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(sanitize(e.target.value))}
      onFocus={onFocus}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs font-mono"
    />
  );
}

export function VariablesPanel() {
  const doc = useDocument();
  const variables = doc.variables ?? [];
  const addVariable = useEditorStoreContext((s) => s.addVariable);
  const updateVariable = useEditorStoreContext((s) => s.updateVariable);
  const removeVariable = useEditorStoreContext((s) => s.removeVariable);
  const pauseTracking = usePauseTracking();
  const resumeTracking = useResumeTracking();

  const [expanded, setExpanded] = useState<string | null>(null);

  const resolved = resolveVariables(variables);

  const handleAdd = () => {
    // Generate unique name
    let i = 1;
    const names = new Set(variables.map((v) => v.name));
    while (names.has(`variable${i}`)) i++;
    addVariable({ name: `variable${i}`, type: 'text', defaultValue: '' });
    setExpanded(`variable${i}`);
  };

  const handleTypeChange = (name: string, type: VariableType) => {
    const updates: Partial<LabelVariable> = { type };
    if (type === 'counter') {
      updates.counter = { ...DEFAULT_COUNTER };
    } else if (type === 'date') {
      updates.format = 'YYYY-MM-DD';
    }
    updateVariable(name, updates);
  };

  return (
    <CollapsibleSection
      title={`Variables${variables.length > 0 ? ` (${variables.length})` : ''}`}
      icon={<Variable size={12} />}
      defaultOpen
    >
      <div className="px-3 pb-3">
      <div className="flex justify-end mb-1.5">
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
          title="Add variable"
        >
          <Plus size={10} />
          Add
        </button>
      </div>

      {variables.length === 0 && (
        <p className="text-[10px] text-gray-400">No variables defined.</p>
      )}

      <div className="space-y-1">
        {variables.map((v, i) => (
          <div key={i} className="border border-gray-200 rounded">
            <button
              onClick={() => setExpanded(expanded === v.name ? null : v.name)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-50"
            >
              <span className="text-xs font-mono flex-1 truncate">{v.name}</span>
              <span className="text-[10px] text-gray-400">{v.type}</span>
              <span className="text-[10px] text-gray-400 font-mono truncate max-w-[80px]">{resolved[v.name]}</span>
            </button>

            {expanded === v.name && (
              <div className="px-2 pb-2 space-y-2 border-t border-gray-100">
                <label className="block mt-2">
                  <span className="text-[10px] text-gray-500">Name</span>
                  <VariableNameInput
                    name={v.name}
                    onRename={(newName) => {
                      updateVariable(v.name, { name: newName });
                      setExpanded(newName);
                    }}
                    onFocus={pauseTracking}
                    onBlur={resumeTracking}
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] text-gray-500">Type</span>
                  <select
                    value={v.type}
                    onChange={(e) => handleTypeChange(v.name, e.target.value as VariableType)}
                    className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                  >
                    <option value="text">Text</option>
                    <option value="date">Date</option>
                    <option value="counter">Counter</option>
                  </select>
                </label>

                {v.type === 'text' && (
                  <label className="block">
                    <span className="text-[10px] text-gray-500">Default Value</span>
                    <input
                      value={v.defaultValue}
                      onChange={(e) => updateVariable(v.name, { defaultValue: e.target.value })}
                      onFocus={pauseTracking}
                      onBlur={resumeTracking}
                      className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs"
                    />
                  </label>
                )}

                {v.type === 'date' && (
                  <label className="block">
                    <span className="text-[10px] text-gray-500">Format</span>
                    <input
                      value={v.format ?? 'YYYY-MM-DD'}
                      onChange={(e) => updateVariable(v.name, { format: e.target.value })}
                      onFocus={pauseTracking}
                      onBlur={resumeTracking}
                      placeholder="YYYY-MM-DD"
                      className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs font-mono"
                    />
                    <p className="text-[9px] text-gray-400 mt-0.5">YYYY, YY, MM, DD, HH, mm, ss</p>
                  </label>
                )}

                {v.type === 'counter' && v.counter && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <label className="flex-1">
                        <span className="text-[10px] text-gray-500">Start</span>
                        <NumberInput value={v.counter.start} onChange={(val) => updateVariable(v.name, { counter: { ...v.counter!, start: val } })} fallback={1} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
                      </label>
                      <label className="flex-1">
                        <span className="text-[10px] text-gray-500">Step</span>
                        <NumberInput value={v.counter.increment} onChange={(val) => updateVariable(v.name, { counter: { ...v.counter!, increment: val } })} fallback={1} min={1} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
                      </label>
                      <label className="flex-1">
                        <span className="text-[10px] text-gray-500">Pad</span>
                        <NumberInput value={v.counter.padding} onChange={(val) => updateVariable(v.name, { counter: { ...v.counter!, padding: val } })} fallback={0} min={0} max={20} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
                      </label>
                    </div>
                    <div className="flex gap-1.5">
                      <label className="flex-1">
                        <span className="text-[10px] text-gray-500">Prefix</span>
                        <input
                          value={v.counter.prefix}
                          onChange={(e) => updateVariable(v.name, { counter: { ...v.counter!, prefix: e.target.value } })}
                          onFocus={pauseTracking}
                          onBlur={resumeTracking}
                          className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs font-mono"
                        />
                      </label>
                      <label className="flex-1">
                        <span className="text-[10px] text-gray-500">Suffix</span>
                        <input
                          value={v.counter.suffix}
                          onChange={(e) => updateVariable(v.name, { counter: { ...v.counter!, suffix: e.target.value } })}
                          onFocus={pauseTracking}
                          onBlur={resumeTracking}
                          className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs font-mono"
                        />
                      </label>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { removeVariable(v.name); setExpanded(null); }}
                  className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 mt-1"
                >
                  <Trash2 size={10} />
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      </div>
    </CollapsibleSection>
  );
}
