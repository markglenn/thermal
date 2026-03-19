'use client';

import type { LineProperties } from '@/lib/types';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';

interface Props {
  componentId: string;
  props: LineProperties;
}

export function LinePropertiesPanel({ componentId, props }: Props) {
  const updateProperties = useEditorStoreContext((s) => s.updateProperties);
  const updateLayout = useEditorStoreContext((s) => s.updateLayout);
  const storeApi = useEditorStoreApi();

  return (
    <div className="px-3 pb-3">
      <div className="space-y-2">
        <label>
          <span className="text-xs text-gray-500">Thickness ({props.thickness})</span>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={props.thickness}
            onChange={(e) => {
              const thickness = parseInt(e.target.value);
              updateProperties(componentId, { thickness });
              if (props.orientation === 'horizontal') {
                updateLayout(componentId, { height: thickness });
              } else {
                updateLayout(componentId, { width: thickness });
              }
            }}
            className="w-full mt-1"
          />
        </label>
        <label>
          <span className="text-xs text-gray-500">Orientation</span>
          <select
            value={props.orientation}
            onChange={(e) => {
              const orientation = e.target.value;
              if (orientation !== props.orientation) {
                const comp = findComponent(storeApi.getState().document.components, componentId);
                if (comp) {
                  updateProperties(componentId, { orientation });
                  updateLayout(componentId, { width: comp.layout.height, height: comp.layout.width });
                }
              }
            }}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
      </div>
    </div>
  );
}
