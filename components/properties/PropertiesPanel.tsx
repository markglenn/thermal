'use client';

import { PanelRightClose } from 'lucide-react';
import { useSelectedComponent, useEditorStoreContext } from '@/lib/store/editor-context';
import { getDefinition } from '@/lib/components';
import { LabelSettings } from '../toolbar/LabelSettings';
import { ConstraintEditor } from './ConstraintEditor';
import { FieldBindingEditor } from './FieldBindingEditor';
import { VisibilityConditionEditor } from './VisibilityConditionEditor';
import { CollapsibleSection } from '../ui/CollapsibleSection';

interface Props {
  onCollapse?: () => void;
}

function MultiSelectOrEmptyMessage() {
  const count = useEditorStoreContext((s) => s.selectedComponentIds.length);
  return (
    <div className="p-3 text-sm text-gray-400 text-center mt-8" data-testid="properties-empty">
      {count > 1
        ? `${count} components selected`
        : 'Select a component to edit its properties'}
    </div>
  );
}

export function PropertiesPanel({ onCollapse }: Props) {
  const selected = useSelectedComponent();
  const readOnly = useEditorStoreContext((s) => s.readOnly);

  const def = selected ? getDefinition(selected.typeData.type) : null;
  const Panel = def?.PropertiesPanel;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto" data-testid="properties-panel">
      {onCollapse && (
        <div className="px-3 py-1.5 border-b border-gray-200 flex items-center gap-2 shrink-0">
          <button onClick={onCollapse} className="text-gray-400 hover:text-gray-600" title="Collapse panel">
            <PanelRightClose size={14} />
          </button>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Properties</h2>
        </div>
      )}
      <div className={readOnly ? 'pointer-events-none opacity-60' : ''}>
        <LabelSettings />
      </div>

      {selected ? (
        <div className={readOnly ? 'pointer-events-none opacity-60' : ''}>
          <ConstraintEditor component={selected} />

          {Panel && (
            <CollapsibleSection title={def?.label ?? selected.typeData.type}>
              <Panel componentId={selected.id} props={selected.typeData.props} />
            </CollapsibleSection>
          )}

          {def?.traits.bindable && (
            <FieldBindingEditor componentId={selected.id} binding={selected.fieldBinding} />
          )}

          <VisibilityConditionEditor componentId={selected.id} condition={selected.visibilityCondition} />
        </div>
      ) : (
        <MultiSelectOrEmptyMessage />
      )}
    </div>
  );
}
