'use client';

import { useState, useCallback, useEffect } from 'react';
import * as Menubar from '@radix-ui/react-menubar';
import { Flame, History, Check } from 'lucide-react';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { EDITOR_EVENTS } from '@/hooks/use-keyboard-shortcuts';
import { MIN_ZOOM, MAX_ZOOM, labelWidthDots, labelHeightDots, dotsToInches } from '@/lib/constants';
import { formatShortcut, useIsMac } from '@/lib/platform';
import { copyToClipboard, readClipboard } from '@/lib/store/clipboard';
import { useTabStore } from '@/lib/store/tab-store';
import { captureThumbnail } from '@/lib/documents/thumbnail';
import { validateDocument } from '@/lib/documents/validate';
import { exportDocument, importDocument } from '@/lib/documents/file-io';
import { toast } from '@/lib/toast-store';
import { SaveNameModal } from '@/components/documents/SaveNameModal';
import { LabelBrowserModal } from '@/components/documents/LabelBrowserModal';
import { VersionHistoryPanel } from '@/components/documents/VersionHistoryPanel';
import { KeyboardShortcutsModal } from '@/components/editor/KeyboardShortcutsModal';
import { ManageLabelSizesModal } from '@/components/label-sizes/ManageLabelSizesModal';
import type { LabelComponent, LabelDocument } from '@/lib/types';

const triggerClass = 'px-2 py-1 text-xs rounded outline-none select-none data-[highlighted]:bg-gray-100 data-[state=open]:bg-gray-100';
const contentClass = 'bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-44';
const itemClass = 'relative pl-6 pr-3 py-1.5 text-xs outline-none select-none data-[highlighted]:bg-gray-100 data-[disabled]:opacity-50 flex items-center';
const separatorClass = 'border-t border-gray-200 my-1';

function Shortcut({ keys }: { keys: string }) {
  const mac = useIsMac();
  return <span className="ml-auto pl-4 text-gray-400 text-[11px]">{formatShortcut(keys, mac)}</span>;
}

function CheckIndicator({ checked }: { checked: boolean }) {
  return (
    <span className="absolute left-1.5 w-4 flex items-center justify-center">
      <Check size={12} className={checked ? 'opacity-100' : 'opacity-0'} />
    </span>
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
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showLabelSizes, setShowLabelSizes] = useState(false);
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
        const tabState = useTabStore.getState();
        const activeTabId = tabState.activeTabId;
        tabState.updateTabName(activeTabId, name);
        tabState.updateTabLabelId(activeTabId, data.id);
        tabState.markClean(activeTabId);
        tabState.updateTabVersionMeta(activeTabId, data.version, data.status);
      }
      setShowSaveModal(false);
    } catch {
      toast('Save failed. Please try again.', 'error');
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
    } catch {
      toast('Failed to create new version. Please try again.', 'error');
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
    } catch {
      toast('Save failed. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [storeApi]);

  // Listen for keyboard shortcut events
  useEffect(() => {
    const onSave = () => {
      const store = storeApi.getState();
      if (store.readOnly) return;
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
        <div className="flex items-center gap-1.5 mr-2">
          <Flame size={18} className="text-orange-500" />
          <span className="font-bold text-base tracking-tight text-gray-900">Thermal</span>
        </div>

        <Menubar.Root className="flex items-center gap-0.5">
          {/* File */}
          <Menubar.Menu>
            <Menubar.Trigger className={triggerClass}>File</Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content className={contentClass} align="start" sideOffset={4}>
                <Menubar.Item className={itemClass} onSelect={() => useTabStore.getState().createTab()}>
                  New
                </Menubar.Item>
                <Menubar.Item className={itemClass} onSelect={() => setShowBrowserModal(true)}>
                  Open...<Shortcut keys="⌘O" />
                </Menubar.Item>
                <Menubar.Separator className={separatorClass} />
                {isPublished && !readOnly ? (
                  <Menubar.Item className={`${itemClass} text-blue-600`} disabled={isSaving} onSelect={createNewDraft}>
                    {isSaving ? 'Creating...' : 'New Version'}
                  </Menubar.Item>
                ) : (
                  <Menubar.Item className={itemClass} disabled={isSaving || readOnly} onSelect={handleSaveClick}>
                    Save<Shortcut keys="⌘S" />
                  </Menubar.Item>
                )}
                <Menubar.Item className={itemClass} onSelect={() => setShowSaveAsModal(true)}>
                  Save As...<Shortcut keys="⌘⇧S" />
                </Menubar.Item>
                {currentLabelId && (
                  <Menubar.Item className={itemClass} onSelect={() => setShowRenameModal(true)}>
                    Rename...
                  </Menubar.Item>
                )}
                <Menubar.Separator className={separatorClass} />
                <Menubar.Item className={itemClass} onSelect={() => setShowLabelSizes(true)}>
                  Label Sizes...
                </Menubar.Item>
                <Menubar.Separator className={separatorClass} />
                <Menubar.Item className={itemClass} onSelect={() => {
                  const store = storeApi.getState();
                  exportDocument(store.document, store.currentLabelName || 'Untitled Label');
                }}>
                  Export JSON...
                </Menubar.Item>
                <Menubar.Item className={itemClass} onSelect={() => {
                  importDocument(validateDocument).then((result) => {
                    if (!result) return;
                    const tabId = useTabStore.getState().createTab();
                    const tab = useTabStore.getState().tabs.find((t) => t.id === tabId);
                    if (tab) {
                      tab.store.getState().loadDocument(result.document);
                      useTabStore.getState().updateTabName(tabId, result.name);
                    }
                  });
                }}>
                  Import JSON...
                </Menubar.Item>
                <Menubar.Separator className={separatorClass} />
                <Menubar.Item className={itemClass} onSelect={() => {
                  const state = useTabStore.getState();
                  const tab = state.tabs.find((t) => t.id === state.activeTabId);
                  if (tab?.dirty) {
                    if (!confirm(`"${tab.name}" has unsaved changes. Close anyway?`)) return;
                  }
                  state.closeTab(state.activeTabId);
                }}>
                  Close
                </Menubar.Item>
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>

          {/* Edit */}
          <Menubar.Menu>
            <Menubar.Trigger className={triggerClass}>Edit</Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content className={contentClass} align="start" sideOffset={4}>
                <Menubar.Item className={itemClass} onSelect={() => storeApi.temporal.getState().undo()}>
                  Undo<Shortcut keys="⌘Z" />
                </Menubar.Item>
                <Menubar.Item className={itemClass} onSelect={() => storeApi.temporal.getState().redo()}>
                  Redo<Shortcut keys="⌘⇧Z" />
                </Menubar.Item>
                <Menubar.Separator className={separatorClass} />
                <Menubar.Item className={itemClass} onSelect={() => {
                  const state = storeApi.getState();
                  const comps = state.selectedComponentIds
                    .map((id) => state.document.components.find((c) => c.id === id))
                    .filter((c): c is LabelComponent => c != null);
                  if (comps.length > 0) copyToClipboard(comps);
                }}>
                  Copy<Shortcut keys="⌘C" />
                </Menubar.Item>
                <Menubar.Item className={itemClass} onSelect={() => {
                  const state = storeApi.getState();
                  const comps = state.selectedComponentIds
                    .map((id) => state.document.components.find((c) => c.id === id))
                    .filter((c): c is LabelComponent => c != null);
                  if (comps.length > 0) {
                    copyToClipboard(comps);
                    state.selectedComponentIds.forEach((id) => state.removeComponent(id));
                  }
                }}>
                  Cut<Shortcut keys="⌘X" />
                </Menubar.Item>
                <Menubar.Item className={itemClass} onSelect={() => {
                  const clip = readClipboard();
                  if (clip.length > 0) storeApi.getState().pasteComponents(clip);
                }}>
                  Paste<Shortcut keys="⌘V" />
                </Menubar.Item>
                <Menubar.Separator className={separatorClass} />
                <Menubar.Item className={itemClass} onSelect={() => {
                  const ids = storeApi.getState().selectedComponentIds;
                  if (ids.length === 1) storeApi.getState().duplicateComponent(ids[0]);
                }}>
                  Duplicate<Shortcut keys="⌘D" />
                </Menubar.Item>
                <Menubar.Item className={itemClass} onSelect={() => storeApi.getState().selectAll()}>
                  Select All<Shortcut keys="⌘A" />
                </Menubar.Item>
                <Menubar.Item className={itemClass} onSelect={() => {
                  const ids = storeApi.getState().selectedComponentIds;
                  ids.forEach((id) => storeApi.getState().removeComponent(id));
                }}>
                  Delete<Shortcut keys="⌫" />
                </Menubar.Item>
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>

          {/* View */}
          <Menubar.Menu>
            <Menubar.Trigger className={triggerClass}>View</Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content className={`${contentClass} min-w-56`} align="start" sideOffset={4}>
                <Menubar.CheckboxItem className={itemClass} checked={showGrid} onCheckedChange={toggleGrid}>
                  <CheckIndicator checked={showGrid} />
                  Grid
                </Menubar.CheckboxItem>
                <Menubar.CheckboxItem className={itemClass} checked={showRulers} onCheckedChange={toggleRulers}>
                  <CheckIndicator checked={showRulers} />
                  Rulers<Shortcut keys="⇧R" />
                </Menubar.CheckboxItem>
                <Menubar.Separator className={separatorClass} />
                <Menubar.Item className={itemClass} onSelect={() => storeApi.getState().setZoom(Math.min(zoom * 1.25, MAX_ZOOM))}>
                  Zoom In<Shortcut keys="⌘+" />
                </Menubar.Item>
                <Menubar.Item className={itemClass} onSelect={() => storeApi.getState().setZoom(Math.max(zoom / 1.25, MIN_ZOOM))}>
                  Zoom Out<Shortcut keys="⌘−" />
                </Menubar.Item>
                <Menubar.Item className={itemClass} onSelect={() => window.dispatchEvent(new Event(EDITOR_EVENTS.FIT_TO_VIEW))}>
                  Fit to View<Shortcut keys="⌘0" />
                </Menubar.Item>
                <Menubar.Separator className={separatorClass} />
                {[50, 100, 200].map((pct) => (
                  <Menubar.CheckboxItem key={pct} className={itemClass} checked={Math.round(zoom * 100) === pct} onSelect={() => storeApi.getState().setZoom(pct / 100)}>
                    <CheckIndicator checked={Math.round(zoom * 100) === pct} />
                    {pct}%
                  </Menubar.CheckboxItem>
                ))}
                <Menubar.Separator className={separatorClass} />
                <Menubar.Item className={itemClass} onSelect={() => setShowShortcuts(true)}>
                  Keyboard Shortcuts<Shortcut keys="⌘/" />
                </Menubar.Item>
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
        </Menubar.Root>

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
            setVersionLabelSize({
              widthInches: dotsToInches(labelWidthDots(store.document.label, store.activeVariant), store.document.label.dpi),
              heightInches: dotsToInches(labelHeightDots(store.document.label, store.activeVariant), store.document.label.dpi),
            });
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

      {showLabelSizes && (
        <ManageLabelSizesModal
          onClose={() => setShowLabelSizes(false)}
          onChanged={() => {}}
        />
      )}
    </>
  );
}
