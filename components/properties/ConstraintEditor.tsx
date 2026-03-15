'use client';

import { useState, useEffect } from 'react';
import type { LabelComponent, Constraints } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';

interface Props {
  component: LabelComponent;
}

function InlineValue({
  value,
  isSet,
  onToggle,
  onChange,
}: {
  value: number | undefined;
  isSet: boolean;
  onToggle: () => void;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(value !== undefined ? String(value) : '');

  useEffect(() => {
    setText(value !== undefined ? String(value) : '');
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    const parsed = parseInt(raw);
    if (!isNaN(parsed)) onChange(parsed);
  };

  const handleBlur = () => {
    if (!isSet) return;
    const parsed = parseInt(text);
    if (isNaN(parsed)) {
      onChange(0);
      setText('0');
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={isSet ? text : '—'}
      readOnly={!isSet}
      onClick={!isSet ? onToggle : undefined}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className={`w-10 h-5 text-xs text-center rounded outline-none ${
        isSet
          ? 'bg-white border border-blue-400 text-blue-600 font-medium'
          : 'bg-transparent border border-transparent text-gray-300 cursor-pointer hover:text-blue-400'
      }`}
    />
  );
}

function Strut({
  isSet,
  onToggle,
  direction,
}: {
  isSet: boolean;
  onToggle: () => void;
  direction: 'horizontal' | 'vertical';
}) {
  const isH = direction === 'horizontal';
  const color = isSet ? 'bg-red-500' : 'bg-gray-300';
  const hoverClass = isSet ? '' : 'hover:opacity-60';

  return (
    <button
      onClick={onToggle}
      className={`flex items-center justify-center shrink-0 ${hoverClass}`}
      title={isSet ? 'Remove constraint' : 'Add constraint'}
    >
      {isH ? (
        <div className="flex items-center h-4 w-7">
          <div className={`w-0.5 h-3 ${color}`} />
          <div className={`flex-1 h-px ${color}`} />
          <div className={`w-0.5 h-3 ${color}`} />
        </div>
      ) : (
        <div className="flex flex-col items-center w-4 h-7">
          <div className={`h-0.5 w-3 ${color}`} />
          <div className={`flex-1 w-px ${color}`} />
          <div className={`h-0.5 w-3 ${color}`} />
        </div>
      )}
    </button>
  );
}

export function ConstraintEditor({ component }: Props) {
  const updateConstraints = useEditorStore((s) => s.updateConstraints);
  const c = component.constraints;

  const toggle = (key: keyof Constraints) => {
    if (c[key] !== undefined) {
      updateConstraints(component.id, { [key]: undefined });
    } else {
      updateConstraints(component.id, { [key]: 0 });
    }
  };

  const set = (key: keyof Constraints, value: number) => {
    updateConstraints(component.id, { [key]: value });
  };

  const autoSized = ['text', 'barcode', 'qrcode'].includes(component.typeData.type);

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Constraints</h3>

      {/* Visual constraint diagram — fixed layout grid */}
      <div className="flex flex-col items-center">
        {/* Top row */}
        <div className="flex flex-col items-center h-12 justify-end gap-1">
          <InlineValue value={c.top} isSet={c.top !== undefined} onToggle={() => toggle('top')} onChange={(v) => set('top', v)} />
          <Strut isSet={c.top !== undefined} onToggle={() => toggle('top')} direction="vertical" />
        </div>

        {/* Middle row */}
        <div className="flex items-center h-10">
          <div className="flex items-center justify-end w-20 gap-1">
            <InlineValue value={c.left} isSet={c.left !== undefined} onToggle={() => toggle('left')} onChange={(v) => set('left', v)} />
            <Strut isSet={c.left !== undefined} onToggle={() => toggle('left')} direction="horizontal" />
          </div>

          <div className="w-10 h-10 border-2 border-gray-300 rounded-sm bg-gray-50 shrink-0 mx-1" />

          <div className="flex items-center w-20 gap-1">
            <Strut isSet={c.right !== undefined} onToggle={() => toggle('right')} direction="horizontal" />
            <InlineValue value={c.right} isSet={c.right !== undefined} onToggle={() => toggle('right')} onChange={(v) => set('right', v)} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col items-center h-12 justify-start gap-1">
          <Strut isSet={c.bottom !== undefined} onToggle={() => toggle('bottom')} direction="vertical" />
          <InlineValue value={c.bottom} isSet={c.bottom !== undefined} onToggle={() => toggle('bottom')} onChange={(v) => set('bottom', v)} />
        </div>
      </div>

      {/* Width / Height */}
      {!autoSized && (
        <div className="flex gap-3 pt-2 mt-2 border-t border-gray-100">
          <div className="flex-1 flex items-center gap-1.5">
            <button
              onClick={() => toggle('width')}
              className={`w-4 h-4 rounded-sm border text-xs flex items-center justify-center shrink-0 ${
                c.width !== undefined ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'
              }`}
            >
              {c.width !== undefined ? '✓' : ''}
            </button>
            <span className="text-xs text-gray-500">W</span>
            <InlineValue value={c.width} isSet={c.width !== undefined} onToggle={() => toggle('width')} onChange={(v) => set('width', v)} />
          </div>
          <div className="flex-1 flex items-center gap-1.5">
            <button
              onClick={() => toggle('height')}
              className={`w-4 h-4 rounded-sm border text-xs flex items-center justify-center shrink-0 ${
                c.height !== undefined ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'
              }`}
            >
              {c.height !== undefined ? '✓' : ''}
            </button>
            <span className="text-xs text-gray-500">H</span>
            <InlineValue value={c.height} isSet={c.height !== undefined} onToggle={() => toggle('height')} onChange={(v) => set('height', v)} />
          </div>
        </div>
      )}
    </div>
  );
}
