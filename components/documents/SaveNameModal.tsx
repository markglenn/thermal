'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  initialName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function SaveNameModal({ initialName, onConfirm, onCancel }: Props) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && name.trim()) onConfirm(name.trim());
    },
    [onCancel, onConfirm, name]
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[360px] flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Save Label</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4">
          <label className="block">
            <span className="text-xs text-gray-500">Label Name</span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </label>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim())}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
