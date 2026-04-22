'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ALLOWED_API_KEY_ROLES, type Role } from '@/lib/auth/roles';
import type { NewApiKeyInput } from '@/hooks/use-api-keys';

interface Props {
  onConfirm: (input: NewApiKeyInput) => void;
  onCancel: () => void;
}

const ROLE_DESCRIPTIONS: Partial<Record<Role, string>> = {
  viewer: 'Read-only: list labels, read documents, poll job status.',
  service: 'Read + submit print jobs and drain reply events. Cannot edit labels or manage settings.',
};

export function CreateApiKeyModal({ onConfirm, onCancel }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('service');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const valid = name.trim().length > 0;

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm({ name: name.trim(), role });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && valid) handleConfirm();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div
        className="bg-white rounded-lg shadow-xl w-96 flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">New API Key</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="p-4 space-y-3">
          <label className="block">
            <span className="text-xs text-gray-500">Label (for identification)</span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ERP integration"
              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {ALLOWED_API_KEY_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">{ROLE_DESCRIPTIONS[role]}</p>
          </label>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!valid}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
