'use client';

import { MousePointerClick } from 'lucide-react';
import { useSelectedComponent, useEditorStoreContext } from '@/lib/store/editor-context';
import { getDefinition } from '@/lib/components';
import { useFieldSuggestions } from '@/hooks/use-field-suggestions';
import { useVariableBankFields } from '@/hooks/use-variable-bank-fields';
import { LabelSettings } from '../toolbar/LabelSettings';
import { RfidSettings } from '../toolbar/RfidSettings';
import { ConstraintEditor } from './ConstraintEditor';
import { FieldBindingEditor } from './FieldBindingEditor';
import { VisibilityConditionEditor } from './VisibilityConditionEditor';
import { VariableBankSelector } from './VariableBankSelector';
import { CollapsibleSection } from '../ui/CollapsibleSection';

export type PropertiesView = 'component' | 'data' | 'label';

interface Props {
  activeView: PropertiesView;
}

function NoSelectionMessage() {
  const count = useEditorStoreContext((s) => s.selectedComponentIds.length);
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-16 gap-3" data-testid="properties-empty">
      <MousePointerClick size={32} strokeWidth={1.5} />
      <span className="text-xs text-gray-400">
        {count > 1 ? `${count} components selected` : 'Select a component'}
      </span>
    </div>
  );
}

export function PropertiesPanel({ activeView }: Props) {
  const selected = useSelectedComponent();
  const readOnly = useEditorStoreContext((s) => s.readOnly);
  const variableBankId = useEditorStoreContext((s) => s.document.label.variableBankId);
  const bankFields = useVariableBankFields(variableBankId);
  const suggestions = useFieldSuggestions(bankFields);

  const def = selected ? getDefinition(selected.typeData.type) : null;
  const Panel = def?.PropertiesPanel;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col" data-testid="properties-panel">
      {activeView === 'component' && (
        selected ? (
          <div className={readOnly ? 'pointer-events-none opacity-60' : ''}>
            <ConstraintEditor component={selected} />
            {Panel && (
              <CollapsibleSection title={def?.label ?? selected.typeData.type}>
                <Panel componentId={selected.id} props={selected.typeData.props} />
              </CollapsibleSection>
            )}
          </div>
        ) : (
          <NoSelectionMessage />
        )
      )}

      {activeView === 'data' && (
        selected ? (
          <>
            <VariableBankSelector />
            <div className={readOnly ? 'pointer-events-none opacity-60' : ''}>
              {def?.traits.bindable && (
                <FieldBindingEditor componentId={selected.id} binding={selected.fieldBinding} suggestions={suggestions} />
              )}
              <VisibilityConditionEditor componentId={selected.id} condition={selected.visibilityCondition} suggestions={suggestions} />
            </div>
          </>
        ) : (
          <>
            <VariableBankSelector />
            <NoSelectionMessage />
          </>
        )
      )}

      {activeView === 'label' && (
        <>
          <LabelSettings readOnly={readOnly} />
          <RfidSettings readOnly={readOnly} suggestions={suggestions} />
        </>
      )}
    </div>
  );
}
