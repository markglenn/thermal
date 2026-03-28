'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus, Settings, X } from 'lucide-react';
import { useEditorStoreContext, useActiveVariant } from '@/lib/store/editor-context';
import { useLabelConfig } from '@/lib/store/editor-context';
import { DPI_VALUES, getActiveVariant, dotsToUnit, unitToDots } from '@/lib/constants';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { ManageLabelSizesModal } from '../label-sizes/ManageLabelSizesModal';
import type { LabelUnit } from '@/lib/types';

type LabelSize = {
  id: string;
  name: string;
  widthDots: number;
  heightDots: number;
  unit: LabelUnit;
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

const UNIT_LABELS: Record<LabelUnit, string> = { in: 'in', mm: 'mm' };
const UNIT_STEP: Record<LabelUnit, number> = { in: 0.25, mm: 1 };
const UNIT_MAX: Record<LabelUnit, number> = { in: 12, mm: 305 };
const UNIT_MIN: Record<LabelUnit, number> = { in: 0.5, mm: 10 };

export function LabelSettings() {
  const label = useLabelConfig();
  const updateLabelConfig = useEditorStoreContext((s) => s.updateLabelConfig);
  const updateVariant = useEditorStoreContext((s) => s.updateVariant);
  const renameVariant = useEditorStoreContext((s) => s.renameVariant);
  const setActiveVariant = useEditorStoreContext((s) => s.setActiveVariant);
  const addVariant = useEditorStoreContext((s) => s.addVariant);
  const removeVariant = useEditorStoreContext((s) => s.removeVariant);
  const { sizes, refresh } = useLabelSizes();
  const [showManage, setShowManage] = useState(false);
  const [forceCustom, setForceCustom] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const addVariantInputRef = useRef<HTMLInputElement>(null);
  const [editingVariantName, setEditingVariantName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const activeVariantName = useActiveVariant();

  const variant = getActiveVariant(label, activeVariantName);
  const unit = variant.unit;

  // Display values in the variant's preferred unit
  const displayWidth = parseFloat(dotsToUnit(variant.widthDots, label.dpi, unit).toFixed(unit === 'mm' ? 1 : 4));
  const displayHeight = parseFloat(dotsToUnit(variant.heightDots, label.dpi, unit).toFixed(unit === 'mm' ? 1 : 4));

  // Match against saved sizes
  const matchingSize = forceCustom ? undefined : sizes.find(
    (s) => s.widthDots === variant.widthDots
      && s.heightDots === variant.heightDots
      && s.dpi === label.dpi
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
      updateVariant(variant.name, {
        widthDots: size.widthDots,
        heightDots: size.heightDots,
        unit: size.unit,
      });
      updateLabelConfig({ dpi: size.dpi as 203 | 300 | 600 });
    }
  };

  const handleUnitChange = (newUnit: LabelUnit) => {
    updateVariant(variant.name, { unit: newUnit });
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    updateVariant(variant.name, { widthDots: unitToDots(val, label.dpi, unit) });
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    updateVariant(variant.name, { heightDots: unitToDots(val, label.dpi, unit) });
  };

  const handleAddVariant = () => {
    const name = newVariantName.trim();
    if (!name || label.variants.some((v) => v.name === name)) return;
    addVariant({
      name,
      widthDots: variant.widthDots,
      heightDots: variant.heightDots,
      unit: 'mm',
    });
    setActiveVariant(name);
    setShowAddVariant(false);
    setNewVariantName('');
  };

  const commitRename = () => {
    if (editingVariantName && editingValue.trim()) {
      renameVariant(editingVariantName, editingValue.trim());
    }
    setEditingVariantName(null);
    setEditingValue('');
  };

  return (
    <CollapsibleSection title="Label">
      <div className="px-3 pb-3 space-y-2">
        {/* Variants */}
        <div>
          <span className="text-xs text-gray-500">Variants</span>

          {/* Variant tabs with inline add button */}
          <div className="flex mt-0.5 rounded overflow-hidden border border-gray-300">
            {label.variants.map((v) => (
              <button
                key={v.name}
                onClick={() => setActiveVariant(v.name)}
                onDoubleClick={() => {
                  setEditingVariantName(v.name);
                  setEditingValue(v.name);
                }}
                className={`flex-1 px-2 py-1 text-xs font-medium transition-colors relative group ${
                  v.name === activeVariantName
                    ? 'bg-gray-200 text-gray-800 font-semibold'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {editingVariantName === v.name ? (
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') { setEditingVariantName(null); setEditingValue(''); }
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent text-center text-xs font-medium outline-none text-gray-800"
                  />
                ) : (
                  v.name
                )}
                {label.variants.length > 1 && v.name === activeVariantName && editingVariantName !== v.name && (
                  <span
                    onClick={(e) => { e.stopPropagation(); removeVariant(v.name); }}
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-red-200 cursor-pointer"
                  >
                    <X size={10} />
                  </span>
                )}
              </button>
            ))}
            <button
              onClick={() => { if (showAddVariant) { setShowAddVariant(false); setNewVariantName(''); } else { setShowAddVariant(true); requestAnimationFrame(() => addVariantInputRef.current?.focus()); } }}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-l border-gray-300"
              title="Add variant"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Inline add variant form */}
          <div className={`grid transition-all duration-200 ease-out ${showAddVariant ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newVariantName}
                  onChange={(e) => setNewVariantName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddVariant();
                    if (e.key === 'Escape') { setShowAddVariant(false); setNewVariantName(''); }
                  }}
                  placeholder="e.g. UK"
                  ref={addVariantInputRef}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddVariant}
                  disabled={!newVariantName.trim() || label.variants.some((v) => v.name === newVariantName.trim())}
                  className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <label>
          <span className="text-xs text-gray-500">Size</span>
          <select
            value={matchingSize?.id ?? 'custom'}
            onChange={handleSelect}
            className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
          >
            {sizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        <div className="flex justify-end">
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
            {/* Unit toggle */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Unit</span>
              <div className="flex ml-auto rounded overflow-hidden border border-gray-300">
                {(['in', 'mm'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => handleUnitChange(u)}
                    className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                      unit === u
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {UNIT_LABELS[u]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-xs text-gray-500">W ({UNIT_LABELS[unit]})</span>
                <input
                  type="number"
                  step={UNIT_STEP[unit]}
                  min={UNIT_MIN[unit]}
                  max={UNIT_MAX[unit]}
                  value={displayWidth}
                  onChange={handleWidthChange}
                  className="w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </label>
              <label className="flex-1">
                <span className="text-xs text-gray-500">H ({UNIT_LABELS[unit]})</span>
                <input
                  type="number"
                  step={UNIT_STEP[unit]}
                  min={UNIT_MIN[unit]}
                  max={UNIT_MAX[unit]}
                  value={displayHeight}
                  onChange={handleHeightChange}
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

      {showManage && (
        <ManageLabelSizesModal
          onClose={() => setShowManage(false)}
          onChanged={refresh}
        />
      )}
    </CollapsibleSection>
  );
}
