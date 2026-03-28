import { create } from 'zustand';
import { createEditorStore, type EditorStoreApi } from './editor-store';
import type { LabelDocument, VersionStatus } from '../types';

export interface TabInfo {
  id: string;
  labelId: string | null;
  name: string;
  store: EditorStoreApi;
  dirty: boolean;
  /** Reference to the document object at last save/load — compared by identity for dirty detection */
  cleanDocumentRef: LabelDocument;
  /** Unsubscribe from the editor store's document-change listener */
  unsubscribe: () => void;
  /** Which version is currently being viewed (null = latest) */
  viewingVersion: number | null;
  /** Status of the version being viewed */
  viewingVersionStatus: VersionStatus | null;
  /** The latest version number for this label */
  latestVersion: number | null;
  /** Status of the latest version */
  latestStatus: VersionStatus | null;
}

interface TabManagerState {
  tabs: TabInfo[];
  activeTabId: string;
}

interface TabManagerActions {
  createTab: () => string;
  openLabel: (labelId: string, name: string, doc: LabelDocument, version?: number, status?: VersionStatus) => string;
  openLabelVersion: (labelId: string, name: string, doc: LabelDocument, version: number, latestVersion: number, versionStatus: VersionStatus) => void;
  returnToLatest: (tabId: string, doc: LabelDocument, latestVersion: number, latestStatus: VersionStatus) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  markDirty: (tabId: string, dirty: boolean) => void;
  markClean: (tabId: string) => void;
  updateTabName: (tabId: string, name: string) => void;
  updateTabLabelId: (tabId: string, labelId: string) => void;
  updateTabVersionMeta: (tabId: string, version: number, status: VersionStatus) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

type TabStore = TabManagerState & TabManagerActions;

function makeTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function createTab(name: string = 'Untitled', labelId: string | null = null, id: string = makeTabId()): TabInfo {
  const store = createEditorStore();

  const tab: TabInfo = {
    id,
    labelId,
    name,
    store,
    dirty: false,
    cleanDocumentRef: store.getState().document,
    unsubscribe: () => {},
    viewingVersion: null,
    viewingVersionStatus: null,
    latestVersion: null,
    latestStatus: null,
  };

  // Subscribe to document changes and update dirty flag via reference identity
  tab.unsubscribe = store.subscribe((state, prevState) => {
    if (state.document !== prevState.document) {
      const currentTab = useTabStore.getState().tabs.find((t) => t.id === id);
      if (!currentTab) return;
      const isDirty = state.document !== currentTab.cleanDocumentRef;
      if (currentTab.dirty !== isDirty) {
        useTabStore.getState().markDirty(id, isDirty);
      }
    }
  });

  return tab;
}

// Use a stable ID for the initial tab to avoid SSR/client hydration mismatch
const firstTab = createTab('Untitled', null, 'tab_initial');

export const useTabStore = create<TabStore>()((set, get) => ({
  tabs: [firstTab],
  activeTabId: firstTab.id,

  createTab: () => {
    const tab = createTab();
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
    return tab.id;
  },

  openLabel: (labelId, name, doc, version, status) => {
    const state = get();

    // If this label is already open in a tab, switch to it
    const existing = state.tabs.find((t) => t.labelId === labelId);
    if (existing) {
      set({ activeTabId: existing.id });
      return existing.id;
    }

    // If the active tab is a clean untitled tab with no components, reuse it
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    if (activeTab && !activeTab.dirty && !activeTab.labelId) {
      const editorState = activeTab.store.getState();
      if (editorState.document.components.length === 0) {
        activeTab.store.getState().loadDocument(doc);
        activeTab.store.getState().setLabelMeta(labelId, name);
        activeTab.store.getState().setReadOnly(status === 'published');
        const cleanRef = activeTab.store.getState().document;
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === activeTab.id ? {
              ...t,
              labelId,
              name,
              dirty: false,
              cleanDocumentRef: cleanRef,
              viewingVersion: null,
              latestVersion: version ?? null,
              latestStatus: status ?? null,
            } : t
          ),
        }));
        return activeTab.id;
      }
    }

    // Otherwise create a new tab
    const tab = createTab(name, labelId);
    tab.store.getState().loadDocument(doc);
    tab.store.getState().setLabelMeta(labelId, name);
    tab.store.getState().setReadOnly(status === 'published');
    tab.cleanDocumentRef = tab.store.getState().document;
    tab.latestVersion = version ?? null;
    tab.latestStatus = status ?? null;
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.id,
    }));
    return tab.id;
  },

  openLabelVersion: (labelId, name, doc, version, latestVersion, versionStatus) => {
    const state = get();
    const tab = state.tabs.find((t) => t.labelId === labelId);
    if (!tab) return;

    tab.store.getState().loadDocument(doc);
    tab.store.getState().setReadOnly(true);
    const cleanRef = tab.store.getState().document;
    set((s) => ({
      activeTabId: tab.id,
      tabs: s.tabs.map((t) =>
        t.id === tab.id ? { ...t, viewingVersion: version, viewingVersionStatus: versionStatus, latestVersion, dirty: false, cleanDocumentRef: cleanRef } : t
      ),
    }));
  },

  returnToLatest: (tabId, doc, latestVersion, latestStatus) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab) return;

    tab.store.getState().loadDocument(doc);
    tab.store.getState().setReadOnly(latestStatus === 'published');
    const cleanRef = tab.store.getState().document;
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId ? {
          ...t,
          viewingVersion: null,
          viewingVersionStatus: null,
          latestVersion,
          latestStatus,
          dirty: false,
          cleanDocumentRef: cleanRef,
        } : t
      ),
    }));
  },

  closeTab: (tabId) => {
    const state = get();
    const closingTab = state.tabs.find((t) => t.id === tabId);
    closingTab?.unsubscribe();
    const remaining = state.tabs.filter((t) => t.id !== tabId);

    if (remaining.length === 0) {
      set({ tabs: [], activeTabId: '' });
      return;
    }

    // If closing the active tab, switch to an adjacent tab
    let newActiveId = state.activeTabId;
    if (state.activeTabId === tabId) {
      const closedIdx = state.tabs.findIndex((t) => t.id === tabId);
      const nextIdx = Math.min(closedIdx, remaining.length - 1);
      newActiveId = remaining[nextIdx].id;
    }

    set({ tabs: remaining, activeTabId: newActiveId });
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
  },

  markDirty: (tabId, dirty) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, dirty } : t)),
    }));
  },

  markClean: (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    const cleanRef = tab?.store.getState().document;
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, dirty: false, cleanDocumentRef: cleanRef ?? t.cleanDocumentRef } : t
      ),
    }));
  },

  updateTabName: (tabId, name) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)),
    }));
  },

  updateTabLabelId: (tabId, labelId) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, labelId } : t)),
    }));
  },

  updateTabVersionMeta: (tabId, version, status) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, latestVersion: version, latestStatus: status } : t
      ),
    }));
  },

  reorderTabs: (fromIndex, toIndex) => {
    set((state) => {
      const tabs = [...state.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, moved);
      return { tabs };
    });
  },
}));
