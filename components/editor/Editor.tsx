'use client';

import { useState, useEffect } from 'react';
import '@/lib/components'; // Register all component plugins
import { useTabStore } from '@/lib/store/tab-store';
import { EditorStoreProvider } from '@/lib/store/editor-context';
import { TabBar } from './TabBar';
import { ComponentPalette } from '../palette/ComponentPalette';
import { Canvas } from './Canvas';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { Toolbar } from '../toolbar/Toolbar';
import { ZplPreview } from '../preview/ZplPreview';
import { LabelaryPreview } from '../preview/LabelaryPreview';
import { LabelaryApiPreview } from '../preview/LabelaryApiPreview';
import { PanelResizeHandle } from './PanelResizeHandle';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { DragGhost } from './DragGhost';
import { ContextMenuProvider } from '../ui/ContextMenu';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { LabelBrowserModal } from '../documents/LabelBrowserModal';
import { PanelLeftOpen, PanelRightOpen, PanelBottomClose, PanelBottomOpen, FilePlus, FolderOpen, Flame } from 'lucide-react';
import type { LabelDocument } from '@/lib/types';

export function Editor() {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTabName = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.name ?? null;
  });
  const activeStore = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.store ?? null;
  });

  useEffect(() => {
    document.title = activeTabName ? `${activeTabName} — Thermal` : 'Thermal';
  }, [activeTabName]);

  if (!activeStore) {
    return (
      <div className="h-screen flex flex-col bg-white text-gray-900">
        <div className="h-10 border-b border-gray-200 bg-white flex items-center px-3">
          <div className="flex items-center gap-1.5">
            <Flame size={18} className="text-orange-500" />
            <span className="font-bold text-base tracking-tight text-gray-900">Thermal</span>
          </div>
        </div>
        <TabBar />
        <EmptyState />
      </div>
    );
  }

  return (
    <EditorStoreProvider key={activeTabId} store={activeStore}>
      <ContextMenuProvider>
        <EditorInner />
      </ContextMenuProvider>
    </EditorStoreProvider>
  );
}

type PreviewTab = 'zpl' | 'preview' | 'labelary';

function EditorInner() {
  useKeyboardShortcuts();
  const [previewTab, setPreviewTab] = useState<PreviewTab>('preview');

  const [leftWidth, setLeftWidth] = useState(208);
  const [rightWidth, setRightWidth] = useState(256);
  const [bottomHeight, setBottomHeight] = useState(320);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900" onContextMenu={(e) => e.preventDefault()}>
      <DragGhost />
      <Toolbar />
      <TabBar />
      <ReadOnlyBanner />
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        {leftCollapsed ? (
          <button
            onClick={() => setLeftCollapsed(false)}
            className="shrink-0 w-7 border-r border-gray-200 bg-white flex flex-col items-center hover:bg-gray-50 transition-colors cursor-pointer"
            title="Show components panel"
          >
            <PanelLeftOpen size={14} className="text-gray-400 mt-2 mb-3" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
              Components
            </span>
          </button>
        ) : (
          <>
            <div style={{ width: leftWidth }} className="shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
              <ComponentPalette onCollapse={() => setLeftCollapsed(true)} />
            </div>
            <PanelResizeHandle direction="horizontal" size={leftWidth} onSizeChange={setLeftWidth} min={160} max={400} onDoubleClick={() => setLeftCollapsed(true)} />
          </>
        )}

        {/* Center */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 flex overflow-hidden">
            <Canvas />
          </div>

          {/* Bottom preview panel */}
          {bottomCollapsed ? (
            <div className="shrink-0 border-t border-gray-200 flex items-center justify-between px-3 py-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preview</span>
              <button onClick={() => setBottomCollapsed(false)} className="text-gray-400 hover:text-gray-600" title="Show preview panel">
                <PanelBottomOpen size={14} />
              </button>
            </div>
          ) : (
            <>
              <PanelResizeHandle direction="vertical" size={bottomHeight} onSizeChange={setBottomHeight} min={100} max={600} invert onDoubleClick={() => setBottomCollapsed(true)} />
              <div style={{ height: bottomHeight }} className="shrink-0 border-t border-gray-200 flex flex-col">
                <div className="flex border-b border-gray-200 items-center">
                  {(['zpl', 'preview', 'labelary'] as const).map((tab) => (
                    <button
                      key={tab}
                      data-testid={`preview-tab-${tab}`}
                      onClick={() => setPreviewTab(tab)}
                      className={`px-4 py-1.5 text-xs font-medium ${
                        previewTab === tab
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {{ zpl: 'ZPL', preview: 'Preview', labelary: 'Labelary Preview' }[tab]}
                    </button>
                  ))}
                  <div className="ml-auto pr-2">
                    <button onClick={() => setBottomCollapsed(true)} className="text-gray-400 hover:text-gray-600" title="Collapse panel">
                      <PanelBottomClose size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {previewTab === 'zpl' && <ZplPreview />}
                  {previewTab === 'preview' && <LabelaryPreview />}
                  {previewTab === 'labelary' && <LabelaryApiPreview />}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right panel */}
        {rightCollapsed ? (
          <button
            onClick={() => setRightCollapsed(false)}
            className="shrink-0 w-7 border-l border-gray-200 bg-white flex flex-col items-center hover:bg-gray-50 transition-colors cursor-pointer"
            title="Show properties panel"
          >
            <PanelRightOpen size={14} className="text-gray-400 mt-2 mb-3" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest [writing-mode:vertical-lr]">
              Properties
            </span>
          </button>
        ) : (
          <>
            <PanelResizeHandle direction="horizontal" size={rightWidth} onSizeChange={setRightWidth} min={200} max={450} invert onDoubleClick={() => setRightCollapsed(true)} />
            <div style={{ width: rightWidth }} className="shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
              <PropertiesPanel onCollapse={() => setRightCollapsed(true)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const createTab = useTabStore((s) => s.createTab);
  const [showBrowser, setShowBrowser] = useState(false);

  const handleOpenLabel = async (id: string) => {
    const res = await fetch(`/api/labels/${id}`);
    if (res.ok) {
      const data = await res.json();
      useTabStore.getState().openLabel(data.id, data.name, data.document as LabelDocument, data.version, data.status);
    }
    setShowBrowser(false);
  };

  return (
    <>
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <p className="text-gray-400 text-sm">No labels open</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={createTab}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              <FilePlus size={16} />
              New Label
            </button>
            <button
              onClick={() => setShowBrowser(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm text-gray-700"
            >
              <FolderOpen size={16} />
              Open Label
            </button>
          </div>
        </div>
      </div>
      {showBrowser && (
        <LabelBrowserModal
          onSelect={handleOpenLabel}
          onCancel={() => setShowBrowser(false)}
        />
      )}
    </>
  );
}
