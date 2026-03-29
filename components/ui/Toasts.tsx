'use client';

import { X } from 'lucide-react';
import { useToastStore, type Toast } from '@/lib/toast-store';

const typeStyles: Record<Toast['type'], string> = {
  error: 'bg-red-600 text-white',
  success: 'bg-gray-800 text-white',
  info: 'bg-gray-800 text-white',
};

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${typeStyles[t.type]} px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-3 pointer-events-auto toast-enter`}
        >
          {t.message}
          <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
