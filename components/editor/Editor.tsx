'use client';

import { useState, useEffect } from 'react';
import '@/lib/components'; // Register all component plugins
import { useTabStore } from '@/lib/store/tab-store';
import { useRole } from '@/lib/auth/use-session';
import { EditorStoreProvider } from '@/lib/store/editor-context';
import { createEditorStore, type EditorStoreApi } from '@/lib/store/editor-store';
import { TabBar } from './TabBar';
import { ComponentPalette } from '../palette/ComponentPalette';
import { Canvas } from './Canvas';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { Toolbar } from '../toolbar/Toolbar';
import { ZplPreview } from '../preview/ZplPreview';
import { LabelaryPreview } from '../preview/LabelaryPreview';
import { LabelaryApiPreview } from '../preview/LabelaryApiPreview';
import { PanelResizeHandle } from './PanelResizeHandle';
import { useKeyboardShortcuts, EDITOR_EVENTS } from '@/hooks/use-keyboard-shortcuts';
import { useUndoFlash } from '@/hooks/use-undo-flash';
import { DragGhost } from './DragGhost';
import { ContextMenuProvider } from '../ui/ContextMenu';
import { Toasts } from '../ui/Toasts';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import { LabelBrowserModal } from '../documents/LabelBrowserModal';
import { PanelLeftOpen, PanelBottomClose, PanelBottomOpen, FilePlus, FolderOpen, Upload, SlidersHorizontal, Database, Tag } from 'lucide-react';
import type { PropertiesView } from '../properties/PropertiesPanel';
import { fetchJson } from '@/lib/client/fetch';
import { importNlblDocument } from '@/lib/documents/file-io';
import type { LabelDocument } from '@/lib/types';

export function Editor() {
  const role = useRole();
  const setUserRole = useTabStore((s) => s.setUserRole);

  useEffect(() => {
    setUserRole(role);
  }, [role, setUserRole]);

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
      <EmptyStateShell />
    );
  }

  return (
    <EditorStoreProvider key={activeTabId} store={activeStore}>
      <ContextMenuProvider>
        <EditorInner />
      </ContextMenuProvider>
      <Toasts />
    </EditorStoreProvider>
  );
}

function EditorInner() {
  useKeyboardShortcuts();
  useUndoFlash();

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900">
      <DragGhost />
      <Toolbar />
      <TabBar />
      <ReadOnlyBanner />
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 flex overflow-hidden">
            <Canvas />
          </div>
          <BottomPanel />
        </div>
        <RightPanel />
      </div>
    </div>
  );
}

function LeftPanel() {
  const [width, setWidth] = useState(208);
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="shrink-0 w-7 border-r border-gray-200 bg-white flex flex-col items-center hover:bg-gray-50 transition-colors cursor-pointer"
        title="Show components panel"
      >
        <PanelLeftOpen size={14} className="text-gray-400 mt-2 mb-3" />
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
          Components
        </span>
      </button>
    );
  }

  return (
    <>
      <div style={{ width }} className="shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
        <ComponentPalette onCollapse={() => setCollapsed(true)} />
      </div>
      <PanelResizeHandle direction="horizontal" size={width} onSizeChange={setWidth} min={160} max={400} onDoubleClick={() => setCollapsed(true)} />
    </>
  );
}

type PreviewTab = 'zpl' | 'preview' | 'labelary';

function BottomPanel() {
  const [height, setHeight] = useState(320);
  const [collapsed, setCollapsed] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewTab>('preview');

  if (collapsed) {
    return (
      <div className="shrink-0 border-t border-gray-200 flex items-center justify-between px-3 py-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preview</span>
        <button onClick={() => setCollapsed(false)} className="text-gray-400 hover:text-gray-600" title="Show preview panel">
          <PanelBottomOpen size={14} />
        </button>
      </div>
    );
  }

  return (
    <>
      <PanelResizeHandle direction="vertical" size={height} onSizeChange={setHeight} min={100} max={600} invert onDoubleClick={() => setCollapsed(true)} />
      <div style={{ height }} className="shrink-0 border-t border-gray-200 flex flex-col">
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
            <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-gray-600" title="Collapse panel">
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
  );
}

const PROPERTY_VIEWS: { id: PropertiesView; icon: typeof SlidersHorizontal; label: string }[] = [
  { id: 'component', icon: SlidersHorizontal, label: 'Component' },
  { id: 'data', icon: Database, label: 'Data' },
  { id: 'label', icon: Tag, label: 'Label' },
];

function RightPanel() {
  const [width, setWidth] = useState(256);
  const [activeView, setActiveView] = useState<PropertiesView | null>('label');

  const collapsed = activeView === null;

  const handleIconClick = (view: PropertiesView) => {
    if (activeView === view) {
      setActiveView(null);
    } else {
      setActiveView(view);
    }
  };

  useEffect(() => {
    const onShowRfid = () => setActiveView('label');
    window.addEventListener(EDITOR_EVENTS.SHOW_RFID, onShowRfid);
    return () => window.removeEventListener(EDITOR_EVENTS.SHOW_RFID, onShowRfid);
  }, []);

  return (
    <>
      {!collapsed && (
        <PanelResizeHandle direction="horizontal" size={width} onSizeChange={setWidth} min={200} max={450} invert onDoubleClick={() => setActiveView(null)} />
      )}
      {!collapsed && (
        <div style={{ width }} className="shrink-0 bg-white flex flex-col overflow-hidden">
          <PropertiesPanel activeView={activeView} />
        </div>
      )}
      {/* Activity bar — always visible on the right edge */}
      <div className="shrink-0 w-10 border-l border-gray-200 bg-gray-50/80 flex flex-col items-center pt-2 gap-0.5">
        {PROPERTY_VIEWS.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.id;
          return (
            <button
              key={view.id}
              onClick={() => handleIconClick(view.id)}
              title={view.label}
              className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
                isActive
                  ? 'bg-white text-gray-800 shadow-sm ring-1 ring-gray-200'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
    </>
  );
}

/**
 * Render the full chrome (Toolbar + TabBar + EmptyState) when no tab is
 * open. Toolbar hooks require an EditorStoreProvider, so we provide a
 * sentinel empty store — Toolbar itself gates document-dependent items
 * on `activeTabId == null` from the tab store, not on the sentinel's
 * contents.
 */
function EmptyStateShell() {
  const [sentinelStore] = useState<EditorStoreApi>(() => createEditorStore());

  return (
    <EditorStoreProvider store={sentinelStore}>
      <div className="h-screen flex flex-col bg-white text-gray-900">
        <Toolbar />
        <TabBar />
        <EmptyState />
      </div>
    </EditorStoreProvider>
  );
}

function EmptyState() {
  const createTab = useTabStore((s) => s.createTab);
  const userRole = useTabStore((s) => s.userRole);
  const isViewer = userRole === 'viewer';
  const [showBrowser, setShowBrowser] = useState(false);

  const handleOpenLabel = async (id: string) => {
    const data = await fetchJson<{ id: string; name: string; document: unknown; version: number; status: 'published' | null }>(`/api/labels/${id}`);
    if (data) {
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
            {!isViewer && (
              <button
                onClick={createTab}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                <FilePlus size={16} />
                New Label
              </button>
            )}
            <button
              onClick={() => setShowBrowser(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm text-gray-700"
            >
              <FolderOpen size={16} />
              Open Label
            </button>
          </div>
          {!isViewer && (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  importNlblDocument().then((result) => {
                    if (!result) return;
                    const tabId = useTabStore.getState().createTab();
                    const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
                    if (tab) {
                      tab.store.getState().loadDocument(result.document);
                      useTabStore.getState().updateTabName(tabId, result.name);
                    }
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm text-gray-700"
              >
                <Upload size={16} />
                Import NiceLabel
              </button>
            </div>
          )}
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
