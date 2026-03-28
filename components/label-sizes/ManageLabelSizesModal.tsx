'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Pencil, Check, X, Plus } from 'lucide-react';
import { DPI_VALUES, dotsToUnit, unitToDots } from '@/lib/constants';
import { CreateLabelSizeModal } from './CreateLabelSizeModal';
import type { LabelSizeInput } from './CreateLabelSizeModal';
import type { LabelUnit } from '@/lib/types';

export interface LabelSize {
  id: string;
  name: string;
  widthDots: number;
  heightDots: number;
  unit: LabelUnit;
  dpi: number;
}

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

const UNIT_STEP: Record<LabelUnit, number> = { in: 0.25, mm: 1 };
const UNIT_MAX: Record<LabelUnit, number> = { in: 12, mm: 305 };
const UNIT_MIN: Record<LabelUnit, number> = { in: 0.5, mm: 10 };

function EditRow({ size, onSave, onCancel }: {
  size: LabelSize;
  onSave: (updated: LabelSize) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(size.name);
  const [unit, setUnit] = useState<LabelUnit>(size.unit);
  const [width, setWidth] = useState(dotsToUnit(size.widthDots, size.dpi, size.unit));
  const [height, setHeight] = useState(dotsToUnit(size.heightDots, size.dpi, size.unit));
  const [dpi, setDpi] = useState(size.dpi);

  const handleUnitChange = (newUnit: LabelUnit) => {
    if (newUnit === unit) return;
    if (newUnit === 'mm') {
      setWidth(Math.round(width * 25.4));
      setHeight(Math.round(height * 25.4));
    } else {
      setWidth(parseFloat((width / 25.4).toFixed(2)));
      setHeight(parseFloat((height / 25.4).toFixed(2)));
    }
    setUnit(newUnit);
  };

  const valid = name.trim() && width > 0 && height > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave({
      ...size,
      name: name.trim(),
      widthDots: unitToDots(width, dpi, unit),
      heightDots: unitToDots(height, dpi, unit),
      unit,
      dpi,
    });
  };

  return (
    <tr className="bg-blue-50">
      <td className="px-3 py-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-1.5 py-0.5 border border-blue-300 rounded text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
            if (e.key === 'Enter') handleSave();
          }}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex rounded overflow-hidden border border-blue-300 w-fit">
          {(['in', 'mm'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => handleUnitChange(u)}
              className={`px-1.5 py-0.5 text-xs font-medium ${
                unit === u ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step={UNIT_STEP[unit]}
          min={UNIT_MIN[unit]}
          max={UNIT_MAX[unit]}
          value={width}
          onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
          className="w-full px-1.5 py-0.5 border border-blue-300 rounded text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step={UNIT_STEP[unit]}
          min={UNIT_MIN[unit]}
          max={UNIT_MAX[unit]}
          value={height}
          onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
          className="w-full px-1.5 py-0.5 border border-blue-300 rounded text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={dpi}
          onChange={(e) => setDpi(parseInt(e.target.value))}
          className="w-full px-1.5 py-0.5 border border-blue-300 rounded text-sm"
        >
          {DPI_VALUES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={!valid}
            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
            title="Save"
          >
            <Check size={14} />
          </button>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function formatSizeDisplay(dots: number, dpi: number, unit: LabelUnit): string {
  const val = dotsToUnit(dots, dpi, unit);
  return unit === 'mm' ? `${Math.round(val)}` : `${parseFloat(val.toFixed(2))}`;
}

export function ManageLabelSizesModal({ onClose, onChanged }: Props) {
  const [sizes, setSizes] = useState<LabelSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchSizes = useCallback(async () => {
    try {
      const res = await fetch('/api/label-sizes');
      if (res.ok) setSizes(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const initialized = useRef<boolean | null>(null);
  if (initialized.current === null) {
    initialized.current = true;
    fetchSizes();
  }

  const handleSave = async (updated: LabelSize) => {
    const res = await fetch('/api/label-sizes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      setSizes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingId(null);
      onChanged();
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      setSizes((prev) => prev.filter((s) => s.id !== id));
      setDeletingId(null);
      try {
        const res = await fetch(`/api/label-sizes?id=${id}`, { method: 'DELETE' });
        if (!res.ok) fetchSizes();
        else onChanged();
      } catch {
        fetchSizes();
      }
    } else {
      setDeletingId(id);
    }
  };

  const handleCreate = async (input: LabelSizeInput) => {
    const res = await fetch('/api/label-sizes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return;
    await fetchSizes();
    onChanged();
    setShowCreate(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showCreate) return; // let CreateLabelSizeModal handle its own Escape
      if (editingId) setEditingId(null);
      else if (deletingId) setDeletingId(null);
      else onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, editingId, deletingId, showCreate]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"

    >
      <div className="bg-white rounded-lg shadow-xl w-160 max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Manage Label Sizes</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
          ) : sizes.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              No label sizes defined yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Width</th>
                  <th className="px-3 py-2 font-medium">Height</th>
                  <th className="px-3 py-2 font-medium">DPI</th>
                  <th className="px-3 py-2 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {sizes.map((size) =>
                  editingId === size.id ? (
                    <EditRow
                      key={size.id}
                      size={size}
                      onSave={handleSave}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <tr key={size.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                      <td className="px-3 py-2 font-medium">{size.name}</td>
                      <td className="px-3 py-2">{size.unit}</td>
                      <td className="px-3 py-2">{formatSizeDisplay(size.widthDots, size.dpi, size.unit)}</td>
                      <td className="px-3 py-2">{formatSizeDisplay(size.heightDots, size.dpi, size.unit)}</td>
                      <td className="px-3 py-2">{size.dpi}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingId(size.id); setDeletingId(null); }}
                            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(size.id)}
                            className={`p-1 rounded transition-colors ${
                              deletingId === size.id
                                ? 'bg-red-100 text-red-600'
                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                            }`}
                            title={deletingId === size.id ? 'Click again to confirm' : 'Delete'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            <Plus size={14} />
            New Size
          </button>
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded">
            Done
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateLabelSizeModal
          onConfirm={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>,
    document.body
  );
}
