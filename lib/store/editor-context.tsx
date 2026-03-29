'use client';

import { createContext, useContext, useCallback } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { EditorStore, EditorStoreApi } from './editor-store';

const EditorStoreContext = createContext<EditorStoreApi | null>(null);

export function EditorStoreProvider({
  store,
  children,
}: {
  store: EditorStoreApi;
  children: React.ReactNode;
}) {
  return (
    <EditorStoreContext.Provider value={store}>
      {children}
    </EditorStoreContext.Provider>
  );
}

/** Get the raw store API for imperative access (getState, temporal, etc.) */
export function useEditorStoreApi(): EditorStoreApi {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error('useEditorStoreApi must be used within EditorStoreProvider');
  return store;
}

/** Subscribe to a slice of the active tab's editor store */
export function useEditorStoreContext<T>(selector: (state: EditorStore) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error('useEditorStoreContext must be used within EditorStoreProvider');
  return useStore(store, selector);
}

/** Subscribe with shallow equality (for object/array slices) */
export function useEditorStoreShallow<T>(selector: (state: EditorStore) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error('useEditorStoreShallow must be used within EditorStoreProvider');
  return useStore(store, useShallow(selector));
}

// Convenience selectors matching hooks/use-editor-store.ts

export function useDocument() {
  return useEditorStoreContext((s) => s.document);
}

export function useViewport() {
  return useEditorStoreShallow((s) => s.viewport);
}

export function useSelectedComponent() {
  return useEditorStoreContext((s) => {
    if (s.selectedComponentIds.length !== 1) return null;
    const id = s.selectedComponentIds[0];
    return s.document.components.find((c) => c.id === id) ?? null;
  });
}

export function useLabelConfig() {
  return useEditorStoreContext((s) => s.document.label);
}

export function useActiveVariant() {
  return useEditorStoreContext((s) => s.activeVariant);
}


/** Pause undo tracking for the active tab's store */
export function usePauseTracking() {
  const store = useEditorStoreApi();
  return useCallback(() => store.temporal.getState().pause(), [store]);
}

/** Resume undo tracking for the active tab's store */
export function useResumeTracking() {
  const store = useEditorStoreApi();
  return useCallback(() => store.temporal.getState().resume(), [store]);
}
