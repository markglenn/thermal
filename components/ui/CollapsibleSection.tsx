'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface Props {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, icon, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 flex items-center gap-1.5 bg-gray-50 border-y border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <ChevronRight
          size={12}
          className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
        />
        {icon}
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
      </button>
      {open && <div className="pt-2">{children}</div>}
    </div>
  );
}
