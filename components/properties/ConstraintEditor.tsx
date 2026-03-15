'use client';

import type { LabelComponent, Constraints } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';

interface Props {
  component: LabelComponent;
}

function ConstraintInput({
  label,
  value,
  isSet,
  onToggle,
  onChange,
}: {
  label: string;
  value: number | undefined;
  isSet: boolean;
  onToggle: () => void;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onToggle}
        className={`w-4 h-4 rounded-sm border text-xs flex items-center justify-center ${
          isSet ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-300'
        }`}
      >
        {isSet ? '✓' : ''}
      </button>
      <span className="text-xs text-gray-500 w-6">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        disabled={!isSet}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="flex-1 px-1.5 py-0.5 border border-gray-300 rounded text-xs disabled:bg-gray-50 disabled:text-gray-300"
      />
    </div>
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

  // Text and barcodes auto-size — no width/height constraints
  const autoSized = ['text', 'barcode', 'qrcode'].includes(component.typeData.type);

  return (
    <div className="p-3 border-b border-gray-200">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Constraints</h3>
      <div className="space-y-1.5">
        <ConstraintInput label="T" value={c.top} isSet={c.top !== undefined} onToggle={() => toggle('top')} onChange={(v) => set('top', v)} />
        <ConstraintInput label="B" value={c.bottom} isSet={c.bottom !== undefined} onToggle={() => toggle('bottom')} onChange={(v) => set('bottom', v)} />
        <ConstraintInput label="L" value={c.left} isSet={c.left !== undefined} onToggle={() => toggle('left')} onChange={(v) => set('left', v)} />
        <ConstraintInput label="R" value={c.right} isSet={c.right !== undefined} onToggle={() => toggle('right')} onChange={(v) => set('right', v)} />
        {!autoSized && (
          <>
            <ConstraintInput label="W" value={c.width} isSet={c.width !== undefined} onToggle={() => toggle('width')} onChange={(v) => set('width', v)} />
            <ConstraintInput label="H" value={c.height} isSet={c.height !== undefined} onToggle={() => toggle('height')} onChange={(v) => set('height', v)} />
          </>
        )}
      </div>
    </div>
  );
}
