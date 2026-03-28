'use client';

import { useState, useCallback, useEffect } from 'react';
import { Flame, History, ChevronDown, Undo2, Redo2, Check } from 'lucide-react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { EDITOR_EVENTS } from '@/hooks/use-keyboard-shortcuts';
import { MIN_ZOOM, MAX_ZOOM } from '@/lib/constants';
import { formatShortcut, useIsMac } from '@/lib/platform';
import { useTabStore } from '@/lib/store/tab-store';
import { captureThumbnail } from '@/lib/documents/thumbnail';
import { SaveNameModal } from '@/components/documents/SaveNameModal';
import { LabelBrowserModal } from '@/components/documents/LabelBrowserModal';
import { VersionHistoryPanel } from '@/components/documents/VersionHistoryPanel';
import { KeyboardShortcutsModal } from '@/components/editor/KeyboardShortcutsModal';
import type { LabelDocument } from '@/lib/types';

function ToolbarSeparator() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />;
}

function MenuItem({
  label,
  shortcut,
  checked,
  disabled,
  className: extraClass,
  onClick,
}: {
  label: string;
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
}) {
  const mac = useIsMac();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left pl-2 pr-3 py-1.5 text-xs hover:bg-gray-100 flex items-center gap-1 disabled:opacity-50 ${extraClass ?? ''}`}
    >
      <span className="w-4 shrink-0 flex items-center justify-center">
        {checked !== undefined && <Check size={12} className={checked ? 'opacity-100' : 'opacity-0'} />}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-gray-400 ml-4 shrink-0">{formatShortcut(shortcut, mac)}</span>}
    </button>
  );
}

function MenuDivider() {
  return <div className="border-t border-gray-200 my-1" />;
}

function UndoRedoButtons() {
  const mac = useIsMac();
  const storeApi = useEditorStoreApi();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const temporal = storeApi.temporal;
    const update = () => {
      const { pastStates, futureStates } = temporal.getState();
      setCanUndo(pastStates.length > 0);
      setCanRedo(futureStates.length > 0);
    };
    update();
    return temporal.subscribe(update);
  }, [storeApi]);

  const handleUndo = useCallback(() => {
    storeApi.temporal.getState().undo();
  }, [storeApi]);

  const handleRedo = useCallback(() => {
    storeApi.temporal.getState().redo();
  }, [storeApi]);

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={handleUndo}
        disabled={!canUndo}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
        title={`Undo (${formatShortcut('⌘Z', mac)})`}
      >
        <Undo2 size={14} />
      </button>
      <button
        onClick={handleRedo}
        disabled={!canRedo}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default"
        title={`Redo (${formatShortcut('⌘⇧Z', mac)})`}
      >
        <Redo2 size={14} />
      </button>
    </div>
  );
}

export function Toolbar() {
  const showGrid = useEditorStoreContext((s) => s.showGrid);
  const toggleGrid = useEditorStoreContext((s) => s.toggleGrid);
  const showRulers = useEditorStoreContext((s) => s.showRulers);
  const toggleRulers = useEditorStoreContext((s) => s.toggleRulers);
  const currentLabelName = useEditorStoreContext((s) => s.currentLabelName);
  const zoom = useEditorStoreContext((s) => s.viewport.zoom);
  const storeApi = useEditorStoreApi();

  const readOnly = useEditorStoreContext((s) => s.readOnly);
  const currentLabelId = useEditorStoreContext((s) => s.currentLabelId);
  const latestStatus = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.latestStatus ?? null;
  });
  const isPublished = latestStatus === 'published';

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionThumbnail, setVersionThumbnail] = useState<string | null>(null);
  const [versionLabelSize, setVersionLabelSize] = useState<{ widthInches: number; heightInches: number } | null>(null);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const saveLabel = useCallback(async (name: string) => {
    setIsSaving(true);
    try {
      const store = storeApi.getState();
      const doc = store.document;
      const thumbnail = await captureThumbnail(doc);
      const labelId = store.currentLabelId;

      const url = labelId ? `/api/labels/${labelId}` : '/api/labels';
      const method = labelId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, document: doc, thumbnail }),
      });
      if (res.ok) {
        const data = await res.json();
        store.setLabelMeta(data.id, name);
        // Sync tab metadata
        const tabState = useTabStore.getState();
        const activeTabId = tabState.activeTabId;
        tabState.updateTabName(activeTabId, name);
        tabState.updateTabLabelId(activeTabId, data.id);
        tabState.markClean(activeTabId);
        tabState.updateTabVersionMeta(activeTabId, data.version, data.status);
      }
      setShowSaveModal(false);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [storeApi]);

  const createNewDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const store = storeApi.getState();
      const doc = store.document;
      const thumbnail = await captureThumbnail(doc);
      const labelId = store.currentLabelId;
      if (!labelId) return;

      const res = await fetch(`/api/labels/${labelId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: doc, thumbnail }),
      });
      if (res.ok) {
        const data = await res.json();
        store.setReadOnly(false);
        const tabState = useTabStore.getState();
        const activeTabId = tabState.activeTabId;
        tabState.markClean(activeTabId);
        tabState.updateTabVersionMeta(activeTabId, data.version, data.status);
      }
    } catch (e) {
      console.error('New draft failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [storeApi]);

  const handleSaveClick = useCallback(() => {
    const store = storeApi.getState();
    if (!store.currentLabelId) {
      setShowSaveModal(true);
    } else {
      saveLabel(store.currentLabelName || 'Untitled Label');
    }
  }, [saveLabel, storeApi]);

  const handleOpenLabel = useCallback(async (id: string) => {
    const res = await fetch(`/api/labels/${id}`);
    if (res.ok) {
      const data = await res.json();
      useTabStore.getState().openLabel(data.id, data.name, data.document as LabelDocument, data.version, data.status);
    }
    setShowBrowserModal(false);
  }, []);

  const handleRename = useCallback(async (name: string) => {
    const store = storeApi.getState();
    const labelId = store.currentLabelId;
    if (!labelId) return;

    const res = await fetch(`/api/labels/${labelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      store.setLabelMeta(labelId, name);
      const tabState = useTabStore.getState();
      tabState.updateTabName(tabState.activeTabId, name);
    }
    setShowRenameModal(false);
  }, [storeApi]);

  const handleSaveAs = useCallback(async (name: string) => {
    setIsSaving(true);
    try {
      const store = storeApi.getState();
      const doc = store.document;
      const thumbnail = await captureThumbnail(doc);

      const res = await fetch('/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, document: doc, thumbnail }),
      });
      if (res.ok) {
        const data = await res.json();
        store.setLabelMeta(data.id, name);
        store.setReadOnly(false);
        const tabState = useTabStore.getState();
        const activeTabId = tabState.activeTabId;
        tabState.updateTabName(activeTabId, name);
        tabState.updateTabLabelId(activeTabId, data.id);
        tabState.markClean(activeTabId);
        tabState.updateTabVersionMeta(activeTabId, data.version, data.status);
      }
      setShowSaveAsModal(false);
    } catch (e) {
      console.error('Save As failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [storeApi]);

  // Listen for keyboard shortcut events
  useEffect(() => {
    const onSave = () => {
      const store = storeApi.getState();
      if (store.readOnly) return;
      // If latest is published, Cmd+S is a no-op — user must click New Version
      const tab = useTabStore.getState().tabs.find((t) => t.id === useTabStore.getState().activeTabId);
      if (tab?.latestStatus === 'published') return;
      if (store.currentLabelId) {
        saveLabel(store.currentLabelName || 'Untitled Label');
      } else {
        setShowSaveModal(true);
      }
    };
    const onSaveAs = () => setShowSaveModal(true);
    const onOpen = () => setShowBrowserModal(true);
    const onShortcuts = () => setShowShortcuts(true);

    window.addEventListener(EDITOR_EVENTS.SAVE, onSave);
    window.addEventListener(EDITOR_EVENTS.SAVE_AS, onSaveAs);
    window.addEventListener(EDITOR_EVENTS.OPEN, onOpen);
    window.addEventListener(EDITOR_EVENTS.SHOW_SHORTCUTS, onShortcuts);
    return () => {
      window.removeEventListener(EDITOR_EVENTS.SAVE, onSave);
      window.removeEventListener(EDITOR_EVENTS.SAVE_AS, onSaveAs);
      window.removeEventListener(EDITOR_EVENTS.OPEN, onOpen);
      window.removeEventListener(EDITOR_EVENTS.SHOW_SHORTCUTS, onShortcuts);
    };
  }, [saveLabel, storeApi]);

  return (
    <>
      <div className="h-10 border-b border-gray-200 bg-white flex items-center px-3 gap-1 text-sm" data-testid="toolbar">
        {/* Logo */}
        <div className="flex items-center gap-1.5 mr-1">
          <Flame size={18} className="text-orange-500" />
          <span className="font-bold text-base tracking-tight text-gray-900">Thermal</span>
        </div>

        <ToolbarSeparator />

        {/* Backdrop to close any open menu */}
        {(showFileMenu || showViewMenu) && (
          <div className="fixed inset-0 z-40" onPointerDown={() => { setShowFileMenu(false); setShowViewMenu(false); }} />
        )}

        {/* File menu */}
        <div className="relative z-41">
          <button
            onClick={() => { setShowFileMenu((v) => !v); setShowViewMenu(false); }}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-xs"
          >
            File
            <ChevronDown size={12} />
          </button>
          {showFileMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-44">
              <MenuItem label="New" onClick={() => { setShowFileMenu(false); useTabStore.getState().createTab(); }} />
              <MenuItem label="Open..." shortcut="⌘O" onClick={() => { setShowFileMenu(false); setShowBrowserModal(true); }} />
              <MenuDivider />
              {isPublished && !readOnly ? (
                <MenuItem
                  label={isSaving ? 'Creating...' : 'New Version'}
                  disabled={isSaving}
                  className="text-blue-600"
                  onClick={() => { setShowFileMenu(false); createNewDraft(); }}
                />
              ) : (
                <MenuItem label="Save" shortcut="⌘S" disabled={isSaving || readOnly} onClick={() => { setShowFileMenu(false); handleSaveClick(); }} />
              )}
              <MenuItem label="Save As..." shortcut="⌘⇧S" onClick={() => { setShowFileMenu(false); setShowSaveAsModal(true); }} />
              {currentLabelId && (
                <MenuItem label="Rename..." onClick={() => { setShowFileMenu(false); setShowRenameModal(true); }} />
              )}
              <MenuDivider />
              <MenuItem label="Close" onClick={() => {
                setShowFileMenu(false);
                const state = useTabStore.getState();
                const tab = state.tabs.find((t) => t.id === state.activeTabId);
                if (tab?.dirty) {
                  if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
                }
                state.closeTab(state.activeTabId);
              }} />
            </div>
          )}
        </div>

        <ToolbarSeparator />

        {/* Undo / Redo */}
        <UndoRedoButtons />

        {/* View menu */}
        <div className="relative z-41">
          <button
            onClick={() => { setShowViewMenu((v) => !v); setShowFileMenu(false); }}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-xs"
          >
            View
            <ChevronDown size={12} />
          </button>
          {showViewMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-56">
              <MenuItem label="Grid" checked={showGrid} onClick={() => { toggleGrid(); setShowViewMenu(false); }} />
              <MenuItem label="Rulers" checked={showRulers} shortcut="⇧R" onClick={() => { toggleRulers(); setShowViewMenu(false); }} />
              <MenuDivider />
              <MenuItem label="Zoom In" shortcut="⌘+" onClick={() => { storeApi.getState().setZoom(Math.min(zoom * 1.25, MAX_ZOOM)); setShowViewMenu(false); }} />
              <MenuItem label="Zoom Out" shortcut="⌘−" onClick={() => { storeApi.getState().setZoom(Math.max(zoom / 1.25, MIN_ZOOM)); setShowViewMenu(false); }} />
              <MenuItem label="Fit to View" shortcut="⌘0" onClick={() => { window.dispatchEvent(new Event(EDITOR_EVENTS.FIT_TO_VIEW)); setShowViewMenu(false); }} />
              <MenuDivider />
              {[50, 100, 200].map((pct) => (
                <MenuItem key={pct} label={`${pct}%`} checked={Math.round(zoom * 100) === pct} onClick={() => { storeApi.getState().setZoom(pct / 100); setShowViewMenu(false); }} />
              ))}
              <MenuDivider />
              <MenuItem label="Keyboard Shortcuts" shortcut="⌘/" onClick={() => { setShowShortcuts(true); setShowViewMenu(false); }} />
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Versions */}
        <button
          onClick={async () => {
            const store = storeApi.getState();
            const labelId = store.currentLabelId;
            const thumbnail = await captureThumbnail(store.document);
            if (labelId && !readOnly && thumbnail) {
              fetch(`/api/labels/${labelId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document: store.document, thumbnail }),
              });
            }
            setVersionThumbnail(thumbnail);
            setVersionLabelSize({ widthInches: store.document.label.widthInches, heightInches: store.document.label.heightInches });
            setShowVersionHistory(true);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-xs"
          title="Version History"
        >
          <History size={14} />
          Versions
        </button>
      </div>

      {showSaveModal && (
        <SaveNameModal
          initialName={currentLabelName || 'Untitled Label'}
          onConfirm={saveLabel}
          onCancel={() => setShowSaveModal(false)}
        />
      )}

      {showRenameModal && (
        <SaveNameModal
          initialName={currentLabelName || 'Untitled Label'}
          title="Rename Label"
          confirmLabel="Rename"
          onConfirm={handleRename}
          onCancel={() => setShowRenameModal(false)}
        />
      )}

      {showSaveAsModal && (
        <SaveNameModal
          initialName={(currentLabelName || 'Untitled Label') + ' Copy'}
          title="Save As"
          confirmLabel="Save Copy"
          onConfirm={handleSaveAs}
          onCancel={() => setShowSaveAsModal(false)}
        />
      )}

      {showBrowserModal && (
        <LabelBrowserModal
          onSelect={handleOpenLabel}
          onCancel={() => setShowBrowserModal(false)}
        />
      )}

      {showVersionHistory && (
        <VersionHistoryPanel
          labelId={currentLabelId}
          currentThumbnail={versionThumbnail}
          currentLabelSize={versionLabelSize}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </>
  );
}
