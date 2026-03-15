'use client';

import { useSelectedComponent } from '@/hooks/use-editor-store';
import { getDefinition } from '@/lib/components';
import { LabelSettings } from '../toolbar/LabelSettings';
import { ConstraintEditor } from './ConstraintEditor';

export function PropertiesPanel() {
  const selected = useSelectedComponent();

  const def = selected ? getDefinition(selected.typeData.type) : null;
  const Panel = def?.PropertiesPanel;

  return (
    <div className="w-64 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
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
        </>
      ) : (
        <div className="p-3 text-sm text-gray-400 text-center mt-8">
          Select a component to edit its properties
        </div>
      )}
    </div>
  );
}
