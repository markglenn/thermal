'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface VariableBankInput {
  name: string;
  fields: string[];
}

interface Props {
  onConfirm: (input: VariableBankInput) => void;
  onCancel: () => void;
}

const FIELD_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

function parseFields(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Sanitize: strip invalid chars, ensure starts with letter
    const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '').replace(/^[^a-zA-Z]+/, '');
    if (sanitized && FIELD_NAME_RE.test(sanitized) && !seen.has(sanitized)) {
      seen.add(sanitized);
      result.push(sanitized);
    }
  }
  return result;
}

export function CreateVariableBankModal({ onConfirm, onCancel }: Props) {
  const [name, setName] = useState('');
  const [fieldsText, setFieldsText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const parsedFields = parseFields(fieldsText);
  const valid = name.trim() && parsedFields.length > 0;

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm({ name: name.trim(), fields: parsedFields });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-white rounded-lg shadow-xl w-90 flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">New Variable Bank</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="p-4 space-y-3">
          <label className="block">
            <span className="text-xs text-gray-500">Name</span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ERP Order Fields"
              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">Fields (one per line)</span>
            <textarea
              value={fieldsText}
              onChange={(e) => setFieldsText(e.target.value)}
              placeholder={"orderId\nsku\ncustomerName\nquantity"}
              rows={6}
              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-[9px] text-gray-400 mt-0.5">
              {parsedFields.length} valid field{parsedFields.length !== 1 ? 's' : ''} detected
            </p>
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
