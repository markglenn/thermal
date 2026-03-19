'use client';

import type { EllipseProperties } from '@/lib/types';
import { useEditorStoreContext } from '@/lib/store/editor-context';
import { findComponent } from '@/lib/utils';
import { useEditorStoreApi } from '@/lib/store/editor-context';

interface Props {
  componentId: string;
  props: EllipseProperties;
}

export function EllipsePropertiesPanel({ componentId, props }: Props) {
  const updateProperties = useEditorStoreContext((s) => s.updateProperties);
  const updateLayout = useEditorStoreContext((s) => s.updateLayout);
  const storeApi = useEditorStoreApi();

  const setCircle = (circle: boolean) => {
    updateProperties(componentId, { circle });
    if (circle) {
      // Snap to square using the smaller dimension
      const comp = findComponent(storeApi.getState().document.components, componentId);
      if (comp) {
        const size = Math.min(comp.layout.width, comp.layout.height);
        updateLayout(componentId, { width: size, height: size });
      }
    }
  };

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ellipse</h3>
      <div className="space-y-2">
        <div>
          <span className="text-xs text-gray-500">Shape</span>
          <div className="flex mt-0.5 rounded overflow-hidden border border-gray-300">
            <button
              onClick={() => setCircle(false)}
              className={`flex-1 px-2 py-1 text-xs transition-colors ${
                !props.circle
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Ellipse
            </button>
            <button
              onClick={() => setCircle(true)}
              className={`flex-1 px-2 py-1 text-xs transition-colors border-l border-gray-300 ${
                props.circle
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Circle
            </button>
          </div>
        </div>
        <label>
          <span className="text-xs text-gray-500">Border Thickness ({props.borderThickness})</span>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={props.borderThickness}
            onChange={(e) => updateProperties(componentId, { borderThickness: Number(e.target.value) })}
            className="w-full"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={props.filled}
            onChange={(e) => updateProperties(componentId, { filled: e.target.checked })}
          />
          <span className="text-xs text-gray-500">Filled</span>
        </label>
      </div>
    </div>
  );
}
