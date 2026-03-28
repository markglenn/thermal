'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DPI_VALUES, unitToDots } from '@/lib/constants';
import type { LabelUnit } from '@/lib/types';

export interface LabelSizeInput {
  name: string;
  widthDots: number;
  heightDots: number;
  unit: LabelUnit;
  dpi: 203 | 300 | 600;
}

interface Props {
  onConfirm: (size: LabelSizeInput) => void;
  onCancel: () => void;
}

const UNIT_STEP: Record<LabelUnit, number> = { in: 0.25, mm: 1 };
const UNIT_MAX: Record<LabelUnit, number> = { in: 12, mm: 305 };
const UNIT_MIN: Record<LabelUnit, number> = { in: 0.5, mm: 10 };

export function CreateLabelSizeModal({ onConfirm, onCancel }: Props) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<LabelUnit>('in');
  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(6);
  const [dpi, setDpi] = useState<203 | 300 | 600>(203);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // When switching units, convert the current values
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

  const handleConfirm = () => {
    if (!name.trim() || width <= 0 || height <= 0) return;
    onConfirm({
      name: name.trim(),
      widthDots: unitToDots(width, dpi, unit),
      heightDots: unitToDots(height, dpi, unit),
      unit,
      dpi,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && name.trim()) handleConfirm();
  };

  const valid = name.trim() && width > 0 && height > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"

    >
      <div
        className="bg-white rounded-lg shadow-xl w-90 flex flex-col overflow-hidden"
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

          {/* Unit toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Unit</span>
            <div className="flex rounded overflow-hidden border border-gray-300">
              {(['in', 'mm'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => handleUnitChange(u)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    unit === u
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <label className="flex-1">
              <span className="text-xs text-gray-500">Width ({unit})</span>
              <input
                type="number"
                step={UNIT_STEP[unit]}
                min={UNIT_MIN[unit]}
                max={UNIT_MAX[unit]}
                value={width}
                onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
            <label className="flex-1">
              <span className="text-xs text-gray-500">Height ({unit})</span>
              <input
                type="number"
                step={UNIT_STEP[unit]}
                min={UNIT_MIN[unit]}
                max={UNIT_MAX[unit]}
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
