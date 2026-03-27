'use client';

import { useState, useCallback, useEffect } from 'react';
import { Save, FolderOpen, Flame, History, FilePlus } from 'lucide-react';
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
  const selectedIds = useEditorStoreContext((s) => s.selectedComponentIds);
  const removeComponent = useEditorStoreContext((s) => s.removeComponent);
  const duplicateComponent = useEditorStoreContext((s) => s.duplicateComponent);
  const currentLabelName = useEditorStoreContext((s) => s.currentLabelName);
  const storeApi = useEditorStoreApi();

  const readOnly = useEditorStoreContext((s) => s.readOnly);
  const currentLabelId = useEditorStoreContext((s) => s.currentLabelId);
  const latestStatus = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.latestStatus ?? null;
  });
  const isProduction = latestStatus === 'production';

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
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

  // Listen for keyboard shortcut events
  useEffect(() => {
    const onSave = () => {
      const store = storeApi.getState();
      if (store.readOnly) return;
      // If latest is production, Cmd+S is a no-op — user must click New Draft
      const tab = useTabStore.getState().tabs.find((t) => t.id === useTabStore.getState().activeTabId);
      if (tab?.latestStatus === 'production') return;
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

        <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-2">
          {isProduction && !readOnly ? (
            <button
              onClick={createNewDraft}
              disabled={isSaving}
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-50 text-blue-600 text-xs disabled:opacity-50"
              title="Create a new draft version to continue editing"
            >
              <FilePlus size={14} />
              {isSaving ? 'Creating...' : 'New Draft'}
            </button>
          ) : (
            <button
              onClick={handleSaveClick}
              disabled={isSaving || readOnly}
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-100 text-xs disabled:opacity-50"
              title={readOnly ? 'Cannot save a read-only version' : 'Save (Shift+click for Save As)'}
            >
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
          <button
            onClick={() => setShowBrowserModal(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-100 text-xs"
            title="Open"
          >
            <FolderOpen size={14} />
            Open
          </button>
          {currentLabelId && (
            <button
              onClick={async () => {
                // Capture fresh thumbnail for the current version before showing history
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

        <div className="flex-1" />

        {selectedIds.length > 0 && !readOnly && (
          <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
            <button
              onClick={() => selectedIds.forEach((id) => duplicateComponent(id))}
              className="px-2 py-0.5 rounded hover:bg-gray-100 text-xs"
            >
              Duplicate{selectedIds.length > 1 ? ` (${selectedIds.length})` : ''}
            </button>
            <button
              onClick={() => selectedIds.forEach((id) => removeComponent(id))}
              className="px-2 py-0.5 rounded hover:bg-red-50 text-red-600 text-xs"
            >
              Delete{selectedIds.length > 1 ? ` (${selectedIds.length})` : ''}
            </button>
          </div>
        )}

      </div>

      {showSaveModal && (
        <SaveNameModal
          initialName={currentLabelName || 'Untitled Label'}
          onConfirm={saveLabel}
          onCancel={() => setShowSaveModal(false)}
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
