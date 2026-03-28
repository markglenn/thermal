'use client';

import { useEditorStoreContext } from '@/lib/store/editor-context';
import { getDefinition } from '@/lib/components';

export function DragGhost() {
  const dropState = useEditorStoreContext((s) => s.paletteDropState);
  if (!dropState) return null;

  const def = getDefinition(dropState.type);
  const Icon = def.icon;

  return (
    <>
      {/* Drop indicator at cursor */}
      <div
        className="fixed pointer-events-none z-50 w-5 h-5 -translate-x-1/2 -translate-y-1/2"
        style={{ left: dropState.ghostX, top: dropState.ghostY }}
      >
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500" />
      </div>

      {/* Ghost label offset from cursor */}
      <div
        className="fixed pointer-events-none z-50 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 shadow-lg opacity-90 flex items-center gap-2"
        style={{
          left: dropState.ghostX + 16,
          top: dropState.ghostY + 16,
        }}
      >
        <Icon size={18} className="text-gray-500" />
        {def.label}
      </div>
    </>
  );
}
