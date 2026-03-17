'use client';

import { PanelRightClose } from 'lucide-react';
import { useSelectedComponent } from '@/hooks/use-editor-store';
import { getDefinition } from '@/lib/components';
import { LabelSettings } from '../toolbar/LabelSettings';
import { ConstraintEditor } from './ConstraintEditor';

interface Props {
  onCollapse?: () => void;
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
        </>
      ) : (
        <div className="p-3 text-sm text-gray-400 text-center mt-8">
          Select a component to edit its properties
        </div>
      )}
    </div>
  );
}
