'use client';

import { useMemo } from 'react';
import type { LabelComponent, PinnableEdge } from '@/lib/types';
import { useEditorStoreContext } from '@/lib/store/editor-context';
import { getSizingMode } from '@/lib/components';
import { useDocument } from '@/lib/store/editor-context';
import { resolveDocument } from '@/lib/constraints/resolver';
import { NumberInput } from './NumberInput';

interface Props {
  component: LabelComponent;
}

function PinValue({
  value,
  isPinned,
  onChange,
}: {
  value: number;
  isPinned: boolean;
  onChange: (v: number) => void;
}) {
  if (!isPinned) {
    return <div className="w-10 h-5" />;
  }
  return (
    <NumberInput
      value={value}
      onChange={onChange}
      fallback={0}
      className="w-10 h-5 text-xs text-center rounded outline-none bg-white border border-blue-400 text-blue-600 font-medium"
    />
  );
}

function Strut({
  isSet,
  onToggle,
  direction,
  disabled,
}: {
  isSet: boolean;
  onToggle: () => void;
  direction: 'horizontal' | 'vertical';
  disabled?: boolean;
}) {
  const isH = direction === 'horizontal';

  let color = 'bg-gray-300';
  let className = 'hover:opacity-60';
  let title = 'Pin to edge';

  if (disabled) {
    color = 'bg-gray-200';
    className = 'opacity-30 cursor-not-allowed';
    title = 'Cannot pin both edges on auto-sized component';
  } else if (isSet) {
    color = 'bg-red-500';
    className = '';
    title = 'Unpin';
  }

  return (
    <button
      onClick={disabled ? undefined : onToggle}
      className={`flex items-center justify-center shrink-0 ${className}`}
      title={title}
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
  const updateConstraints = useEditorStoreContext((s) => s.updateConstraints);
  const togglePin = useEditorStoreContext((s) => s.togglePin);
  const doc = useDocument();

  const pins = component.pins;
  const isPinned = (edge: PinnableEdge) => pins.includes(edge);
  const c = component.constraints;

  const boundsMap = useMemo(() => resolveDocument(doc), [doc]);
  const bounds = boundsMap.get(component.id);
  const x = Math.round(bounds?.x ?? 0);
  const y = Math.round(bounds?.y ?? 0);
  const w = Math.round(bounds?.width ?? 0);
  const h = Math.round(bounds?.height ?? 0);

  const sizingMode = getSizingMode(component);
  const autoSized = sizingMode === 'auto';

  const hPinned = isPinned('left') || isPinned('right');
  const vPinned = isPinned('top') || isPinned('bottom');

  const setX = (val: number) => {
    if (hPinned) return;
    updateConstraints(component.id, { left: val });
  };
  const setY = (val: number) => {
    if (vPinned) return;
    updateConstraints(component.id, { top: val });
  };
  const setW = (val: number) => updateConstraints(component.id, { width: val });
  const setH = (val: number) => updateConstraints(component.id, { height: val });

  return (
    <div className="p-3 border-b border-gray-200">
      {/* Position */}
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Position</h3>
      <div className="grid grid-cols-4 gap-1 mb-3">
        <label className="flex items-center gap-1 col-span-2">
          <span className={`text-xs shrink-0 ${hPinned ? 'text-gray-300' : 'text-gray-500'}`}>X</span>
          <NumberInput
            value={x}
            onChange={setX}
            fallback={0}
            className={`w-full px-1.5 py-0.5 border rounded text-xs ${hPinned ? 'border-gray-200 text-gray-300 bg-gray-50' : 'border-gray-300'}`}
          />
        </label>
        <label className="flex items-center gap-1 col-span-2">
          <span className={`text-xs shrink-0 ${vPinned ? 'text-gray-300' : 'text-gray-500'}`}>Y</span>
          <NumberInput
            value={y}
            onChange={setY}
            fallback={0}
            className={`w-full px-1.5 py-0.5 border rounded text-xs ${vPinned ? 'border-gray-200 text-gray-300 bg-gray-50' : 'border-gray-300'}`}
          />
        </label>
        {!autoSized && (
          <>
            <label className="flex items-center gap-1 col-span-2">
              <span className="text-xs text-gray-500 shrink-0">W</span>
              <NumberInput value={w} onChange={setW} fallback={100} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
            </label>
            <label className="flex items-center gap-1 col-span-2">
              <span className="text-xs text-gray-500 shrink-0">H</span>
              <NumberInput value={h} onChange={setH} fallback={40} className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs" />
            </label>
          </>
        )}
      </div>

      {/* Pin diagram with inline values */}
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pins</h3>
      <div className="flex flex-col items-center gap-1">
        {/* Top */}
        <div className="flex flex-col items-center gap-0.5">
          <PinValue value={c.top ?? 0} isPinned={isPinned('top')} onChange={(v) => updateConstraints(component.id, { top: v })} />
          <Strut isSet={isPinned('top')} onToggle={() => togglePin(component.id, 'top')} direction="vertical" disabled={autoSized && isPinned('bottom') && !isPinned('top')} />
        </div>

        {/* Middle: Left — Box — Right */}
        <div className="flex items-center gap-0.5">
          <PinValue value={c.left ?? 0} isPinned={isPinned('left')} onChange={(v) => updateConstraints(component.id, { left: v })} />
          <Strut isSet={isPinned('left')} onToggle={() => togglePin(component.id, 'left')} direction="horizontal" disabled={autoSized && isPinned('right') && !isPinned('left')} />
          <div className="w-8 h-8 border-2 border-gray-300 rounded-sm bg-gray-50 shrink-0 mx-0.5" />
          <Strut isSet={isPinned('right')} onToggle={() => togglePin(component.id, 'right')} direction="horizontal" disabled={autoSized && isPinned('left') && !isPinned('right')} />
          <PinValue value={c.right ?? 0} isPinned={isPinned('right')} onChange={(v) => updateConstraints(component.id, { right: v })} />
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-0.5">
          <Strut isSet={isPinned('bottom')} onToggle={() => togglePin(component.id, 'bottom')} direction="vertical" disabled={autoSized && isPinned('top') && !isPinned('bottom')} />
          <PinValue value={c.bottom ?? 0} isPinned={isPinned('bottom')} onChange={(v) => updateConstraints(component.id, { bottom: v })} />
        </div>
      </div>
    </div>
  );
}
