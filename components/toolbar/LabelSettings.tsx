'use client';

import { useEditorStoreContext } from '@/lib/store/editor-context';
import { useLabelConfig } from '@/lib/store/editor-context';
import { DPI_VALUES, LABEL_PRESETS } from '@/lib/constants';

export function LabelSettings() {
  const label = useLabelConfig();
  const updateLabelConfig = useEditorStoreContext((s) => s.updateLabelConfig);

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Label</h3>
      <div className="space-y-2">
        <div className="flex gap-2">
          <label className="flex-1">
            <span className="text-xs text-gray-500">W (in)</span>
            <input
              type="number"
              step="0.25"
              min="0.5"
              max="12"
              value={label.widthInches}
              onChange={(e) => updateLabelConfig({ widthInches: parseFloat(e.target.value) || 1 })}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="text-xs text-gray-500">H (in)</span>
            <input
              type="number"
              step="0.25"
              min="0.5"
              max="12"
              value={label.heightInches}
              onChange={(e) => updateLabelConfig({ heightInches: parseFloat(e.target.value) || 1 })}
              className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </label>
        </div>
        <label>
          <span className="text-xs text-gray-500">DPI</span>
          <select
            value={label.dpi}
            onChange={(e) => updateLabelConfig({ dpi: parseInt(e.target.value) as 203 | 300 | 600 })}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
          >
            {DPI_VALUES.map((d) => (
              <option key={d} value={d}>{d} DPI</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1">
          {Object.entries(LABEL_PRESETS).map(([name, preset]) => (
            <button
              key={name}
              onClick={() => updateLabelConfig(preset)}
              className="px-2 py-0.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
