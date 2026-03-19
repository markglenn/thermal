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
  const [draft, setDraft] = useState({ text: String(value), syncedValue: value });
  const pauseTracking = usePauseTracking();
  const resumeTracking = useResumeTracking();

  // Sync external value → text when not focused.
  // React allows setState during render when the value is derived from changed props.
  if (draft.syncedValue !== value) {
    setDraft({ text: String(value), syncedValue: value });
  }

  const handleChange = (raw: string) => {
    setDraft({ text: raw, syncedValue: value });
    if (raw === '-' || raw === '') return;
    const parsed = parseInt(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed));
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(draft.text);
    if (isNaN(parsed)) {
      onChange(fallback);
      setDraft({ text: String(fallback), syncedValue: fallback });
    }
    resumeTracking();
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft.text}
      onFocus={pauseTracking}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className={className ?? 'w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm'}
    />
  );
}
