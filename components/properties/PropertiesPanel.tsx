'use client';

import { PanelRightClose, Link } from 'lucide-react';
import { useSelectedComponent, useEditorStoreContext, usePauseTracking, useResumeTracking } from '@/lib/store/editor-context';
import { getDefinition } from '@/lib/components';
import { LabelSettings } from '../toolbar/LabelSettings';
import { ConstraintEditor } from './ConstraintEditor';
import { VariablesPanel } from './VariablesPanel';

interface Props {
  onCollapse?: () => void;
}

function MultiSelectOrEmptyMessage() {
  const count = useEditorStoreContext((s) => s.selectedComponentIds.length);
  return (
    <div className="p-3 text-sm text-gray-400 text-center mt-8">
      {count > 1
        ? `${count} components selected`
        : 'Select a component to edit its properties'}
    </div>
  );
}

export function PropertiesPanel({ onCollapse }: Props) {
  const selected = useSelectedComponent();

  const def = selected ? getDefinition(selected.typeData.type) : null;
  const Panel = def?.PropertiesPanel;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {onCollapse && (
        <div className="px-3 py-1.5 border-b border-gray-200 flex justify-start shrink-0">
          <button onClick={onCollapse} className="text-gray-400 hover:text-gray-600" title="Collapse panel">
            <PanelRightClose size={14} />
          </button>
        </div>
      )}
      <LabelSettings />

      {selected ? (
        <>
          <div className="px-3 py-2 border-b border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {def?.label ?? selected.typeData.type}
            </h3>
          </div>

          <ConstraintEditor component={selected} />

          {Panel && (
            <Panel componentId={selected.id} props={selected.typeData.props} />
          )}

          {def?.traits.bindable && (
            <FieldBindingEditor componentId={selected.id} binding={selected.fieldBinding} />
          )}
        </>
      ) : (
        <MultiSelectOrEmptyMessage />
      )}

      <VariablesPanel />
    </div>
  );
}

function FieldBindingEditor({ componentId, binding }: { componentId: string; binding?: string }) {
  const updateFieldBinding = useEditorStoreContext((s) => s.updateFieldBinding);
  const variables = useEditorStoreContext((s) => s.document.variables) ?? [];
  const pauseTracking = usePauseTracking();
  const resumeTracking = useResumeTracking();

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Link size={12} />
        Field Binding
      </h3>
      {variables.length > 0 && (
        <select
          value={binding ?? ''}
          onChange={(e) => updateFieldBinding(componentId, e.target.value || undefined)}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono mb-1.5"
        >
          <option value="">None</option>
          {variables.map((v) => (
            <option key={v.name} value={v.name}>{v.name} ({v.type})</option>
          ))}
        </select>
      )}
      <input
        value={binding ?? ''}
        onChange={(e) => {
          // Strip invalid characters — allow letters, digits, underscores, hyphens
          const sanitized = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').replace(/^[^a-zA-Z]+/, '');
          updateFieldBinding(componentId, sanitized || undefined);
        }}
        onFocus={pauseTracking}
        onBlur={resumeTracking}
        placeholder="e.g. recipientName"
        className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono"
      />
      <p className="text-[10px] text-gray-400 mt-1">
        {variables.length > 0 ? 'Select a variable or type a custom field name' : 'Bind to a variable field for the print API'}
      </p>
    </div>
  );
}
