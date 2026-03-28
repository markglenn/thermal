'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Save, FolderOpen, Flame, History, FilePlus, ChevronDown } from 'lucide-react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { EDITOR_EVENTS } from '@/hooks/use-keyboard-shortcuts';
import { useTabStore } from '@/lib/store/tab-store';
import { captureThumbnail } from '@/lib/documents/thumbnail';
import { SaveNameModal } from '@/components/documents/SaveNameModal';
import { LabelBrowserModal } from '@/components/documents/LabelBrowserModal';
import { VersionHistoryPanel } from '@/components/documents/VersionHistoryPanel';
import type { LabelDocument } from '@/lib/types';

export function Toolbar() {
  const showGrid = useEditorStoreContext((s) => s.showGrid);
  const toggleGrid = useEditorStoreContext((s) => s.toggleGrid);
  const showRulers = useEditorStoreContext((s) => s.showRulers);
  const toggleRulers = useEditorStoreContext((s) => s.toggleRulers);
  const currentLabelName = useEditorStoreContext((s) => s.currentLabelName);
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
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);

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

  const handleSaveClick = useCallback((e: React.MouseEvent) => {
    const store = storeApi.getState();
    if (e.shiftKey || !store.currentLabelId) {
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

  // Close save menu on outside click
  useEffect(() => {
    if (!showSaveMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
        setShowSaveMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSaveMenu]);

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

    window.addEventListener(EDITOR_EVENTS.SAVE, onSave);
    window.addEventListener(EDITOR_EVENTS.SAVE_AS, onSaveAs);
    window.addEventListener(EDITOR_EVENTS.OPEN, onOpen);
    return () => {
      window.removeEventListener(EDITOR_EVENTS.SAVE, onSave);
      window.removeEventListener(EDITOR_EVENTS.SAVE_AS, onSaveAs);
      window.removeEventListener(EDITOR_EVENTS.OPEN, onOpen);
    };
  }, [saveLabel, storeApi]);

  return (
    <>
      <div className="h-10 border-b border-gray-200 bg-white flex items-center px-3 gap-2 text-sm" data-testid="toolbar">
        <div className="flex items-center gap-1.5">
          <Flame size={18} className="text-orange-500" />
          <span className="font-bold text-base tracking-tight text-gray-900">Thermal</span>
        </div>
        <span className="mr-2" />

        <button
          onClick={toggleGrid}
          className={`px-2 py-0.5 rounded text-xs ${showGrid ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        >
          Grid
        </button>
        <button
          onClick={toggleRulers}
          className={`px-2 py-0.5 rounded text-xs ${showRulers ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        >
          Rulers
        </button>

        <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-2">
          <div className="relative" ref={saveMenuRef}>
            <div className="flex items-center">
              {isPublished && !readOnly ? (
                <button
                  onClick={createNewDraft}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-l hover:bg-blue-50 text-blue-600 text-xs disabled:opacity-50"
                  title="Create a new version to continue editing"
                >
                  <FilePlus size={14} />
                  {isSaving ? 'Creating...' : 'New Version'}
                </button>
              ) : (
                <button
                  onClick={handleSaveClick}
                  disabled={isSaving || readOnly}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-l hover:bg-gray-100 text-xs disabled:opacity-50"
                  title="Save"
                >
                  <Save size={14} />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              )}
              <button
                onClick={() => setShowSaveMenu((v) => !v)}
                className="px-0.5 py-0.5 rounded-r hover:bg-gray-100 text-xs border-l border-gray-200"
                title="More save options"
              >
                <ChevronDown size={12} />
              </button>
            </div>
            {showSaveMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-36">
                {currentLabelId && (
                  <button
                    onClick={() => { setShowSaveMenu(false); setShowRenameModal(true); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                  >
                    Rename...
                  </button>
                )}
                <button
                  onClick={() => { setShowSaveMenu(false); setShowSaveAsModal(true); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100"
                >
                  Save As...
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowBrowserModal(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-100 text-xs"
            title="Open"
          >
            <FolderOpen size={14} />
            Open
          </button>
        </div>

        <div className="flex-1" />

        {currentLabelId && (
          <button
            onClick={async () => {
              const store = storeApi.getState();
              const labelId = store.currentLabelId;
              if (labelId && !readOnly) {
                const thumbnail = await captureThumbnail(store.document);
                if (thumbnail) {
                  fetch(`/api/labels/${labelId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ document: store.document, thumbnail }),
                  });
                }
              }
              setShowVersionHistory(true);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-100 text-xs"
            title="Versions"
          >
            <History size={14} />
            Versions
          </button>
        )}
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

      {showVersionHistory && currentLabelId && (
        <VersionHistoryPanel
          labelId={currentLabelId}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </>
  );
}
