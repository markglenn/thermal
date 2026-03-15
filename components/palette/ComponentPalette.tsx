'use client';

import { getAllDefinitions } from '@/lib/components';
import { PaletteItem } from './PaletteItem';
import { LayerHierarchy } from './LayerHierarchy';
import type { ComponentType } from '@/lib/types';

export function ComponentPalette() {
  const definitions = getAllDefinitions();

  return (
    <div className="w-52 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Components palette */}
      <div className="shrink-0">
        <div className="px-3 py-2 border-b border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Components</h2>
        </div>
        <div className="p-1 flex flex-col gap-0.5">
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
