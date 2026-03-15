'use client';

import { useCallback } from 'react';
import type { ComponentType } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';

interface Props {
  type: ComponentType;
  label: string;
  icon: string;
}

export function PaletteItem({ type, label, icon }: Props) {
  const addComponent = useEditorStore((s) => s.addComponent);

  const handleClick = useCallback(() => {
    addComponent(type);
  }, [type, addComponent]);

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-100 active:bg-gray-200 transition-colors"
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
