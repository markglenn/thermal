'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  /** Label shown before confirmation */
  label: string;
  /** Label shown in the confirmation state */
  confirmLabel?: string;
  /** Icon element to render before the label */
  icon?: React.ReactNode;
  /** Called when the user confirms (second click) */
  onConfirm: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Milliseconds before the confirm state auto-resets (default 3000) */
  timeout?: number;
  /** Class for the initial (idle) state */
  className?: string;
  /** Class for the confirming state */
  confirmClassName?: string;
}

export function ConfirmButton({
  label,
  confirmLabel = 'Are you sure?',
  icon,
  onConfirm,
  disabled = false,
  timeout = 3000,
  className = 'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity',
  confirmClassName = 'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition-colors',
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirming) {
      setConfirming(false);
      if (timer.current) clearTimeout(timer.current);
      onConfirm();
    } else {
      setConfirming(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setConfirming(false), timeout);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={confirming ? confirmClassName : className}
    >
      {icon}
      {confirming ? confirmLabel : label}
    </button>
  );
}
