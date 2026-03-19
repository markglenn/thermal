'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus, Settings } from 'lucide-react';
import { useEditorStoreContext } from '@/lib/store/editor-context';
import { useLabelConfig } from '@/lib/store/editor-context';
import { DPI_VALUES } from '@/lib/constants';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { CreateLabelSizeModal } from '../label-sizes/CreateLabelSizeModal';
import { ManageLabelSizesModal } from '../label-sizes/ManageLabelSizesModal';
import type { LabelSizeInput } from '../label-sizes/CreateLabelSizeModal';

type LabelSize = {
  id: string;
  name: string;
  widthInches: number;
  heightInches: number;
  dpi: number;
};

function useLabelSizes() {
  const [sizes, setSizes] = useState<LabelSize[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/label-sizes');
      if (res.ok) setSizes(await res.json());
    } catch { /* ignore */ }
  }, []);

  const initialized = useRef<boolean | null>(null);
  if (initialized.current === null) {
    initialized.current = true;
    refresh();
  }

  return { sizes, refresh };
}

export function LabelSettings() {
  const label = useLabelConfig();
  const updateLabelConfig = useEditorStoreContext((s) => s.updateLabelConfig);
  const { sizes, refresh } = useLabelSizes();
  const [showCreate, setShowCreate] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [forceCustom, setForceCustom] = useState(false);

  const matchingSize = forceCustom ? undefined : sizes.find(
    (s) => s.widthInches === label.widthInches && s.heightInches === label.heightInches && s.dpi === label.dpi
  );

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setForceCustom(true);
      return;
    }
    setForceCustom(false);
    const size = sizes.find((s) => s.id === value);
    if (size) {
      updateLabelConfig({
        widthInches: size.widthInches,
        heightInches: size.heightInches,
        dpi: size.dpi as 203 | 300 | 600,
      });
    }
  };

  const handleCreate = async (input: LabelSizeInput) => {
    const res = await fetch('/api/label-sizes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      await refresh();
      updateLabelConfig({
        widthInches: input.widthInches,
        heightInches: input.heightInches,
        dpi: input.dpi,
      });
    }
    setShowCreate(false);
  };

  return (
    <CollapsibleSection title="Label">
      <div className="px-3 pb-3 space-y-2">
        <label>
          <span className="text-xs text-gray-500">Size</span>
          <select
            value={matchingSize?.id ?? 'custom'}
            onChange={handleSelect}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
          >
            {sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.widthInches}&quot; x {s.heightInches}&quot; @ {s.dpi})
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        <div className="flex justify-between">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded"
          >
            <Plus size={12} />
            New Size
          </button>
          <button
            onClick={() => setShowManage(true)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded"
          >
            <Settings size={12} />
            Manage
          </button>
        </div>

        {!matchingSize && (
          <>
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
          </>
        )}
      </div>

      {showCreate && (
        <CreateLabelSizeModal
          onConfirm={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}
      {showManage && (
        <ManageLabelSizesModal
          onClose={() => setShowManage(false)}
          onChanged={refresh}
        />
      )}
    </CollapsibleSection>
  );
}
