'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Pencil, Check, X, Plus } from 'lucide-react';
import { CreateVariableBankModal } from './CreateVariableBankModal';
import { useVariableBanks } from '@/hooks/use-variable-banks';
import type { VariableBank } from '@/lib/types';

interface Props {
  onClose: () => void;
}

const FIELD_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

function EditRow({ bank, onSave, onCancel }: {
  bank: VariableBank;
  onSave: (updated: VariableBank) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(bank.name);
  const [fieldsText, setFieldsText] = useState(bank.fields.join('\n'));

  const parseFields = (raw: string): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '').replace(/^[^a-zA-Z]+/, '');
      if (sanitized && FIELD_NAME_RE.test(sanitized) && !seen.has(sanitized)) {
        seen.add(sanitized);
        result.push(sanitized);
      }
    }
    return result;
  };

  const parsedFields = parseFields(fieldsText);
  const valid = name.trim() && parsedFields.length > 0;

  const handleSave = () => {
    if (!valid) return;
    onSave({ ...bank, name: name.trim(), fields: parsedFields });
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
        <textarea
          value={fieldsText}
          onChange={(e) => setFieldsText(e.target.value)}
          rows={3}
          className="w-full px-1.5 py-0.5 border border-blue-300 rounded text-xs font-mono resize-none"
        />
        <p className="text-[9px] text-gray-400">{parsedFields.length} field{parsedFields.length !== 1 ? 's' : ''}</p>
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

export function ManageVariableBanksModal({ onClose }: Props) {
  const vb = useVariableBanks(onClose);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-140 max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Manage Variable Banks</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {vb.loading ? (
            <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
          ) : vb.banks.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              No variable banks defined yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-4 pb-2 font-medium">Name</th>
                  <th className="px-4 pb-2 font-medium">Fields</th>
                  <th className="px-4 pb-2 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {vb.banks.map((bank) =>
                  vb.editingId === bank.id ? (
                    <EditRow
                      key={bank.id}
                      bank={bank}
                      onSave={vb.save}
                      onCancel={() => vb.setEditingId(null)}
                    />
                  ) : (
                    <tr key={bank.id} className="border-t border-gray-100 hover:bg-gray-50 group">
                      <td className="px-4 py-3 font-medium">{bank.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className="font-mono text-xs">{bank.fields.slice(0, 5).join(', ')}</span>
                        {bank.fields.length > 5 && (
                          <span className="text-gray-400 text-xs"> +{bank.fields.length - 5} more</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { vb.setEditingId(bank.id); vb.setDeletingId(null); }}
                            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => vb.remove(bank.id)}
                            className={`p-1 rounded transition-colors ${
                              vb.deletingId === bank.id
                                ? 'bg-red-100 text-red-600'
                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                            }`}
                            title={vb.deletingId === bank.id ? 'Click again to confirm' : 'Delete'}
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

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => vb.setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
          >
            <Plus size={14} />
            New Bank
          </button>
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">
            Done
          </button>
        </div>
      </div>

      {vb.showCreate && (
        <CreateVariableBankModal
          onConfirm={vb.create}
          onCancel={() => vb.setShowCreate(false)}
        />
      )}
    </div>,
    document.body
  );
}
