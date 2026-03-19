'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DPI_VALUES } from '@/lib/constants';

export interface LabelSizeInput {
  name: string;
  widthInches: number;
  heightInches: number;
  dpi: 203 | 300 | 600;
}

interface Props {
  onConfirm: (size: LabelSizeInput) => void;
  onCancel: () => void;
}

export function CreateLabelSizeModal({ onConfirm, onCancel }: Props) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(6);
  const [dpi, setDpi] = useState<203 | 300 | 600>(203);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && name.trim()) {
      onConfirm({ name: name.trim(), widthInches: width, heightInches: height, dpi });
    }
  };

  const valid = name.trim() && width > 0 && height > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[360px] flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">New Label Size</h2>
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
              placeholder="e.g. Shipping 4x6"
              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex-1">
              <span className="text-xs text-gray-500">Width (in)</span>
              <input
                type="number"
                step="0.25"
                min="0.5"
                max="12"
                value={width}
                onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
            <label className="flex-1">
              <span className="text-xs text-gray-500">Height (in)</span>
              <input
                type="number"
                step="0.25"
                min="0.5"
                max="12"
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-gray-500">DPI</span>
            <select
              value={dpi}
              onChange={(e) => setDpi(parseInt(e.target.value) as 203 | 300 | 600)}
              className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {DPI_VALUES.map((d) => (
                <option key={d} value={d}>{d} DPI</option>
              ))}
            </select>
          </label>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded">
            Cancel
          </button>
          <button
            onClick={() => valid && onConfirm({ name: name.trim(), widthInches: width, heightInches: height, dpi })}
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
