'use client';

import { PanelLeftClose } from 'lucide-react';
import { getAllDefinitions } from '@/lib/components';
import { useEditorStoreContext } from '@/lib/store/editor-context';
import { PaletteItem } from './PaletteItem';
import { LayerHierarchy } from './LayerHierarchy';
import type { ComponentType } from '@/lib/types';

interface Props {
  onCollapse?: () => void;
}

export function ComponentPalette({ onCollapse }: Props) {
  const definitions = getAllDefinitions();
  const readOnly = useEditorStoreContext((s) => s.readOnly);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Components palette */}
      <div className="shrink-0">
        <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Components</h2>
          {onCollapse && (
            <button onClick={onCollapse} className="text-gray-400 hover:text-gray-600" title="Collapse panel">
              <PanelLeftClose size={14} />
            </button>
          )}
        </div>
        <div className={`p-1 flex flex-col gap-0.5 ${readOnly ? 'opacity-50 pointer-events-none' : ''}`}>
          {definitions.map((def) => (
            <PaletteItem key={def.type} type={def.type as ComponentType} label={def.label} icon={def.icon} />
          ))}
        </div>
      </div>

      {/* Layer hierarchy */}
      <div className="flex-1 overflow-y-auto border-t border-gray-200">
        <LayerHierarchy />
      </div>
    </div>
  );
}
