'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: never;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuEntry[];
}

interface ContextMenuProviderProps {
  children: React.ReactNode;
}

let showMenuGlobal: ((state: ContextMenuState) => void) | null = null;

/** Show a context menu at the given position. Call from onContextMenu handlers. */
export function showContextMenu(x: number, y: number, items: ContextMenuEntry[]) {
  showMenuGlobal?.({ x, y, items });
}

export function ContextMenuProvider({ children }: ContextMenuProviderProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    showMenuGlobal = setMenu;
    return () => { showMenuGlobal = null; };
  }, []);

  // Close on outside click or scroll
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  // Adjust position to stay within viewport
  const adjustPosition = useCallback((el: HTMLDivElement | null) => {
    if (!el || !menu) return;
    const rect = el.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    if (menu.x > maxX || menu.y > maxY) {
      setMenu({ ...menu, x: Math.min(menu.x, maxX), y: Math.min(menu.y, maxY) });
    }
  }, [menu]);

  return (
    <>
      {children}
      {menu && createPortal(
        <div
          className="fixed inset-0 z-100"
          onMouseDown={() => setMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setMenu(null); }}
        >
          <div
            ref={adjustPosition}
            className="absolute bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-40"
            style={{ left: menu.x, top: menu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
          {menu.items.map((item, i) => {
            if ('separator' in item && item.separator) {
              return <div key={i} className="border-t border-gray-100 my-1" />;
            }
            const entry = item as ContextMenuItem;
            return (
              <button
                key={i}
                onClick={() => {
                  setMenu(null);
                  entry.onClick();
                }}
                disabled={entry.disabled}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 disabled:opacity-40 ${
                  entry.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {entry.icon}
                {entry.label}
              </button>
            );
          })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
