'use client';

import { useState, useEffect } from 'react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  fallback?: number;
  className?: string;
}

export function NumberInput({ value, onChange, min, max, fallback = 0, className }: Props) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(String(value));
    }
  }, [value, focused]);

  const handleChange = (raw: string) => {
    setText(raw);
    if (raw === '-' || raw === '') return;
    const parsed = parseInt(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed));
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseInt(text);
    if (isNaN(parsed)) {
      onChange(fallback);
      setText(String(fallback));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className={className ?? 'w-full mt-0.5 px-2 py-1 border border-gray-300 rounded text-sm'}
    />
  );
}
