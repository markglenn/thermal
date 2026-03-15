'use client';

import { useEditorStore } from '@/lib/store/editor-store';

export function DragGhost() {
  const dropState = useEditorStore((s) => s.paletteDropState);
  if (!dropState) return null;

  return (
    <div
      className="fixed pointer-events-none z-50 bg-blue-100 border-2 border-blue-400 rounded px-3 py-1.5 text-sm font-medium text-blue-700 opacity-80 shadow-md"
      style={{
        left: dropState.ghostX + 12,
        top: dropState.ghostY + 12,
      }}
    >
      {dropState.type.charAt(0).toUpperCase() + dropState.type.slice(1)}
    </div>
  );
}
