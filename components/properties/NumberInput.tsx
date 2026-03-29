'use client';

import { useState } from 'react';
import { usePauseTracking, useResumeTracking } from '@/lib/store/editor-context';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  fallback?: number;
  className?: string;
}

export function NumberInput({ value, onChange, min, max, fallback = 0, className }: Props) {
  const [draft, setDraft] = useState({ text: String(value), syncedValue: value, focused: false });
  const pauseTracking = usePauseTracking();

  // Sync external value → text only when not focused.
  // While focused, the user owns the text — don't overwrite mid-edit.
  if (draft.syncedValue !== value && !draft.focused) {
    setDraft({ text: String(value), syncedValue: value, focused: false });
  }

  const resumeTracking = useResumeTracking();

  const handleChange = (raw: string) => {
    setDraft({ text: raw, syncedValue: value, focused: true });
    if (raw === '-' || raw === '') return;
    const parsed = parseInt(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed));
      onChange(clamped);
    }
  };

  const handleFocus = () => {
    setDraft((d) => ({ ...d, focused: true }));
    pauseTracking();
  };

  const handleBlur = () => {
    const parsed = parseInt(draft.text);
    if (isNaN(parsed)) {
      onChange(fallback);
      setDraft({ text: String(fallback), syncedValue: fallback, focused: false });
    } else {
      const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed));
      setDraft({ text: String(clamped), syncedValue: clamped, focused: false });
    }
    resumeTracking();
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft.text}
      onFocus={handleFocus}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className={className ?? 'w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm'}
    />
  );
}
