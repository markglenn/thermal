'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { DPI_VALUES } from '@/lib/constants';

export interface LabelSize {
  id: string;
  name: string;
  widthInches: number;
  heightInches: number;
  dpi: number;
}

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

function EditRow({ size, onSave, onCancel }: {
  size: LabelSize;
  onSave: (updated: LabelSize) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(size.name);
  const [width, setWidth] = useState(size.widthInches);
  const [height, setHeight] = useState(size.heightInches);
  const [dpi, setDpi] = useState(size.dpi);

  const valid = name.trim() && width > 0 && height > 0;

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
            if (e.key === 'Enter' && valid) onSave({ ...size, name: name.trim(), widthInches: width, heightInches: height, dpi });
          }}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.25"
          min="0.5"
          max="12"
          value={width}
          onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
          className="w-full px-1.5 py-0.5 border border-blue-300 rounded text-sm"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.25"
          min="0.5"
          max="12"
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
            onClick={() => valid && onSave({ ...size, name: name.trim(), widthInches: width, heightInches: height, dpi })}
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

export function ManageLabelSizesModal({ onClose, onChanged }: Props) {
  const [sizes, setSizes] = useState<LabelSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId) setEditingId(null);
        else if (deletingId) setDeletingId(null);
        else onClose();
      }
    },
    [onClose, editingId, deletingId]
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={handleKeyDown}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-xl w-140 max-h-[80vh] flex flex-col overflow-hidden">
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
                  <th className="px-3 py-2 font-medium">W (in)</th>
                  <th className="px-3 py-2 font-medium">H (in)</th>
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
                      <td className="px-3 py-2">{size.widthInches}</td>
                      <td className="px-3 py-2">{size.heightInches}</td>
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

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded">
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
