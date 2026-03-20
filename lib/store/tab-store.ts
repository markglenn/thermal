import { create } from 'zustand';
import { createEditorStore, type EditorStoreApi } from './editor-store';
import type { LabelDocument } from '../types';

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
}

interface TabManagerState {
  tabs: TabInfo[];
  activeTabId: string;
}

interface TabManagerActions {
  createTab: () => string;
  openLabel: (labelId: string, name: string, doc: LabelDocument) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  markDirty: (tabId: string, dirty: boolean) => void;
  markClean: (tabId: string) => void;
  updateTabName: (tabId: string, name: string) => void;
  updateTabLabelId: (tabId: string, labelId: string) => void;
}

type TabStore = TabManagerState & TabManagerActions;

function makeTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function createTab(name: string = 'Untitled', labelId: string | null = null): TabInfo {
  const id = makeTabId();
  const store = createEditorStore();

  const tab: TabInfo = {
    id,
    labelId,
    name,
    store,
    dirty: false,
    cleanDocumentRef: store.getState().document,
    unsubscribe: () => {},
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

// Create the initial tab
const firstTab = createTab();

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

  openLabel: (labelId, name, doc) => {
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
        const cleanRef = activeTab.store.getState().document;
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === activeTab.id ? { ...t, labelId, name, dirty: false, cleanDocumentRef: cleanRef } : t
          ),
        }));
        return activeTab.id;
      }
    }

    // Otherwise create a new tab
    const tab = createTab(name, labelId);
    tab.store.getState().loadDocument(doc);
    tab.store.getState().setLabelMeta(labelId, name);
    tab.cleanDocumentRef = tab.store.getState().document;
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.id,
    }));
    return tab.id;
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
}));
