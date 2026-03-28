'use client';

import { createPortal } from 'react-dom';
import { formatShortcut } from '@/lib/platform';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; label: string }[];
}

const groups: ShortcutGroup[] = [
  {
    title: 'File',
    shortcuts: [
      { keys: '⌘N', label: 'New tab' },
      { keys: '⌘O', label: 'Open label' },
      { keys: '⌘S', label: 'Save' },
      { keys: '⌘⇧S', label: 'Save As' },
      { keys: '⌘W', label: 'Close tab' },
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: '⌘Z', label: 'Undo' },
      { keys: '⌘⇧Z', label: 'Redo' },
      { keys: '⌘C', label: 'Copy' },
      { keys: '⌘X', label: 'Cut' },
      { keys: '⌘V', label: 'Paste' },
      { keys: '⌘D', label: 'Duplicate' },
      { keys: '⌘A', label: 'Select all' },
      { keys: 'Delete', label: 'Delete selected' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: '⌘+', label: 'Zoom in' },
      { keys: '⌘−', label: 'Zoom out' },
      { keys: '⌘0', label: 'Fit to view' },
      { keys: '⇧R', label: 'Toggle rulers' },
      { keys: '⌘/', label: 'Keyboard shortcuts' },
    ],
  },
  {
    title: 'Canvas',
    shortcuts: [
      { keys: '↑↓←→', label: 'Nudge 1px' },
      { keys: '⇧ ↑↓←→', label: 'Nudge 10px' },
      { keys: 'Space + Drag', label: 'Pan canvas' },
      { keys: 'Scroll', label: 'Zoom' },
    ],
  },
];

export function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="bg-white rounded-lg shadow-xl w-[540px] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>
        <div className="p-5 overflow-y-auto grid grid-cols-2 gap-6">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.title}</h3>
              <div className="flex flex-col gap-1">
                {group.shortcuts.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between text-xs py-0.5">
                    <span className="text-gray-700">{s.label}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono text-[11px]">{formatShortcut(s.keys)}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
