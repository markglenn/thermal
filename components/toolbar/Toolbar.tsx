'use client';

import { useState, useCallback } from 'react';
import { Save, FolderOpen } from 'lucide-react';
import { useEditorStore } from '@/lib/store/editor-store';
import { captureThumbnail } from '@/lib/documents/thumbnail';
import { SaveNameModal } from '@/components/documents/SaveNameModal';
import { LabelBrowserModal } from '@/components/documents/LabelBrowserModal';
import type { LabelDocument } from '@/lib/types';

export function Toolbar() {
  const showGrid = useEditorStore((s) => s.showGrid);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const resetDocument = useEditorStore((s) => s.resetDocument);
  const selectedIds = useEditorStore((s) => s.selectedComponentIds);
  const removeComponent = useEditorStore((s) => s.removeComponent);
  const duplicateComponent = useEditorStore((s) => s.duplicateComponent);
  const currentLabelId = useEditorStore((s) => s.currentLabelId);
  const currentLabelName = useEditorStore((s) => s.currentLabelName);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const saveLabel = useCallback(async (name: string) => {
    setIsSaving(true);
    try {
      const store = useEditorStore.getState();
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
      }
      setShowSaveModal(false);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleSaveClick = useCallback((e: React.MouseEvent) => {
    const store = useEditorStore.getState();
    if (e.shiftKey || !store.currentLabelId) {
      setShowSaveModal(true);
    } else {
      saveLabel(store.currentLabelName || 'Untitled Label');
    }
  }, [saveLabel]);

  const handleOpenLabel = useCallback(async (id: string) => {
    const res = await fetch(`/api/labels/${id}`);
    if (res.ok) {
      const data = await res.json();
      const store = useEditorStore.getState();
      store.loadDocument(data.document as LabelDocument);
      store.setLabelMeta(data.id, data.name);
    }
    setShowBrowserModal(false);
  }, []);

  return (
    <>
      <div className="h-10 border-b border-gray-200 bg-white flex items-center px-3 gap-2 text-sm">
        <span className="font-semibold text-gray-700">Thermal</span>
        {currentLabelName && (
          <span className="text-gray-400 text-xs truncate max-w-[200px]">
            — {currentLabelName}
          </span>
        )}
        <span className="mr-2" />

        <button
          onClick={toggleGrid}
          className={`px-2 py-0.5 rounded text-xs ${showGrid ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
        >
          Grid
        </button>

        <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-2">
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-100 text-xs disabled:opacity-50"
            title="Save (Shift+click for Save As)"
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
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

        {selectedIds.length > 0 && (
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

        <button
          onClick={resetDocument}
          className="px-2 py-0.5 rounded hover:bg-gray-100 text-xs text-gray-500"
        >
          Reset
        </button>
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
    </>
  );
}
