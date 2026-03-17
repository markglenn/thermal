import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { current } from 'immer';
import { temporal } from 'zundo';
import type {
  EditorState,
  LabelDocument,
  LabelComponent,
  Constraints,
  ComponentType,
  LabelConfig,
} from '../types';
import { DEFAULT_LABEL, DEFAULT_ZOOM, GRID_SIZE, DUPLICATE_OFFSET, UNDO_THROTTLE_MS, labelWidthDots, labelHeightDots } from '../constants';
import { createComponent, generateId } from './editor-actions';
import { findComponent } from '@/lib/utils';
import { resolveConstraints } from '@/lib/constraints/resolver';

const initialDocument: LabelDocument = {
  version: 1,
  label: { ...DEFAULT_LABEL },
  components: [],
};

const initialState: EditorState = {
  document: initialDocument,
  selectedComponentIds: [],
  viewport: { zoom: DEFAULT_ZOOM, panX: 0, panY: 0 },
  interactionMode: 'select',
  dragState: null,
  resizeState: null,
  paletteDropState: null,
  showGrid: true,
  gridSize: GRID_SIZE,
  currentLabelId: null,
  currentLabelName: null,
};

function findParentArray(
  components: LabelComponent[],
  id: string
): LabelComponent[] | null {
  for (const comp of components) {
    if (comp.id === id) return components;
    if (comp.children) {
      const found = findParentArray(comp.children, id);
      if (found) return found;
    }
  }
  return null;
}

export interface EditorActions {
  // Component CRUD
  addComponent: (type: ComponentType, constraintOverrides?: Partial<Constraints>) => string;
  addComponentToContainer: (containerId: string, type: ComponentType, constraintOverrides?: Partial<Constraints>) => string | null;
  removeComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  updateConstraints: (id: string, constraints: Partial<Constraints>) => void;
  updateMultipleConstraints: (updates: { id: string; constraints: Partial<Constraints> }[]) => void;
  updateProperties: (id: string, props: Record<string, unknown>) => void;
  renameComponent: (id: string, name: string) => void;
  togglePin: (id: string, edge: import('../types').PinnableEdge) => void;
  reorderComponents: (fromIndex: number, toIndex: number) => void;
  reparentComponent: (id: string, newParentId: string | null) => void;

  // Selection
  selectComponent: (id: string | null, opts?: { toggle?: boolean }) => void;
  selectAll: () => void;

  // Viewport
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setViewport: (zoom: number, panX: number, panY: number) => void;

  // Interaction state
  setInteractionMode: (mode: EditorState['interactionMode']) => void;
  setDragState: (state: EditorState['dragState']) => void;
  setResizeState: (state: EditorState['resizeState']) => void;
  setPaletteDropState: (state: EditorState['paletteDropState']) => void;

  // Label settings
  updateLabelConfig: (config: Partial<LabelConfig>) => void;

  // Grid
  toggleGrid: () => void;

  // Document
  loadDocument: (doc: LabelDocument) => void;
  resetDocument: () => void;

  // Label persistence
  setLabelMeta: (id: string | null, name: string | null) => void;
}

export type EditorStore = EditorState & EditorActions & {
  /** Internal: snapshot captured at drag/resize start, flushed as a single undo entry on end */
  _undoBatchSnapshot: { document: LabelDocument } | null;
};

// The store type including temporal (undo/redo) capabilities
export type EditorStoreApi = ReturnType<typeof createEditorStore>;

type ImmerSet = (fn: (state: EditorStore) => void) => void;
type StoreGet = () => EditorStore;

/** Factory function — creates an independent editor store with its own undo history. */
export function createEditorStore() {
  // Per-instance throttle cancel and store ref (closure-scoped, not module-level)
  let cancelThrottledHandleSet: (() => void) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storeRef: any = null;

  function getTemporalState() {
    return storeRef.temporal.getState();
  }

  function enterUndoBatch(set: ImmerSet, get: StoreGet) {
    set((state) => {
      state._undoBatchSnapshot = { document: structuredClone(get().document) };
    });
    getTemporalState().pause();
  }

  function exitUndoBatch(set: ImmerSet, get: StoreGet) {
    const snapshot = get()._undoBatchSnapshot;
    set((state) => {
      state._undoBatchSnapshot = null;
    });
    getTemporalState().resume();
    if (snapshot) {
      const { pastStates } = getTemporalState();
      storeRef.temporal.setState({ pastStates: [...pastStates, snapshot] });
    }
  }

  const store = create<EditorStore>()(
    temporal(
      immer((set, get) => ({
        ...initialState,
        _undoBatchSnapshot: null,

        addComponent: (type, constraintOverrides) => {
          const comp = createComponent(type, constraintOverrides);
          set((state) => {
            state.document.components.push(comp);
            state.selectedComponentIds = [comp.id];
          });
          return comp.id;
        },

        addComponentToContainer: (containerId, type, constraintOverrides) => {
          const currentContainer = findComponent(get().document.components, containerId);
          if (!currentContainer || !currentContainer.children) return null;

          const comp = createComponent(type, constraintOverrides);
          set((state) => {
            const container = findComponent(state.document.components, containerId);
            if (container && container.children) {
              container.children.push(comp);
              state.selectedComponentIds = [comp.id];
            }
          });
          return comp.id;
        },

        removeComponent: (id) => {
          set((state) => {
            const parent = findParentArray(state.document.components, id);
            if (parent) {
              const idx = parent.findIndex((c) => c.id === id);
              if (idx !== -1) parent.splice(idx, 1);
            }
            state.selectedComponentIds = state.selectedComponentIds.filter((sid) => sid !== id);
          });
        },

        duplicateComponent: (id) => {
          set((state) => {
            const parent = findParentArray(state.document.components, id);
            if (!parent) return;
            const idx = parent.findIndex((c) => c.id === id);
            if (idx === -1) return;
            const original = parent[idx];
            const cloned = structuredClone(current(original)) as LabelComponent;
            function reassignIds(comp: LabelComponent) {
              comp.id = generateId();
              comp.name = comp.name + ' Copy';
              if (comp.children) comp.children.forEach(reassignIds);
            }
            reassignIds(cloned);
            if (cloned.constraints.left !== undefined) cloned.constraints.left += DUPLICATE_OFFSET;
            if (cloned.constraints.top !== undefined) cloned.constraints.top += DUPLICATE_OFFSET;
            parent.splice(idx + 1, 0, cloned);
            state.selectedComponentIds = [cloned.id];
          });
        },

        updateConstraints: (id, constraints) => {
          set((state) => {
            const comp = findComponent(state.document.components, id);
            if (comp) {
              Object.assign(comp.constraints, constraints);
            }
          });
        },

        updateMultipleConstraints: (updates) => {
          set((state) => {
            for (const { id, constraints } of updates) {
              const comp = findComponent(state.document.components, id);
              if (comp) {
                Object.assign(comp.constraints, constraints);
              }
            }
          });
        },

        updateProperties: (id, props) => {
          set((state) => {
            const comp = findComponent(state.document.components, id);
            if (comp) {
              Object.assign(comp.typeData.props, props);
            }
          });
        },

        renameComponent: (id, name) => {
          set((state) => {
            const comp = findComponent(state.document.components, id);
            if (comp) comp.name = name;
          });
        },

        togglePin: (id, edge) => {
          const currentState = get();
          const currentComp = findComponent(currentState.document.components, id);
          if (!currentComp) return;

          const alreadyPinned = currentComp.pins.includes(edge);

          let pinValue = 0;
          if (!alreadyPinned && currentComp.constraints[edge] === undefined) {
            const { label } = currentState.document;
            const lw = labelWidthDots(label);
            const lh = labelHeightDots(label);
            const bounds = resolveConstraints(currentComp.constraints, lw, lh);

            switch (edge) {
              case 'left': pinValue = bounds.x; break;
              case 'top': pinValue = bounds.y; break;
              case 'right': pinValue = Math.max(0, lw - bounds.x - bounds.width); break;
              case 'bottom': pinValue = Math.max(0, lh - bounds.y - bounds.height); break;
            }
          }

          set((state) => {
            const comp = findComponent(state.document.components, id);
            if (!comp) return;
            const idx = comp.pins.indexOf(edge);
            if (idx >= 0) {
              comp.pins.splice(idx, 1);
              if (edge === 'right' || edge === 'bottom') {
                delete comp.constraints[edge];
              }
            } else {
              comp.pins.push(edge);
              if (comp.constraints[edge] === undefined) {
                comp.constraints[edge] = pinValue;
              }
            }
          });
        },

        reorderComponents: (fromIndex, toIndex) => {
          set((state) => {
            const comps = state.document.components;
            if (fromIndex < 0 || fromIndex >= comps.length) return;
            if (toIndex < 0 || toIndex >= comps.length) return;
            if (fromIndex === toIndex) return;
            const [moved] = comps.splice(fromIndex, 1);
            comps.splice(toIndex, 0, moved);
          });
        },

        reparentComponent: (id, newParentId) => {
          set((state) => {
            const currentParent = findParentArray(state.document.components, id);
            if (!currentParent) return;
            const idx = currentParent.findIndex((c) => c.id === id);
            if (idx === -1) return;
            const [comp] = currentParent.splice(idx, 1);

            if (newParentId === null) {
              state.document.components.push(comp);
            } else {
              const newParent = findComponent(state.document.components, newParentId);
              if (newParent && newParent.children) {
                newParent.children.push(comp);
              } else {
                state.document.components.push(comp);
              }
            }
          });
        },

        selectComponent: (id, opts) => {
          set((state) => {
            if (id === null) {
              state.selectedComponentIds = [];
            } else if (opts?.toggle) {
              const idx = state.selectedComponentIds.indexOf(id);
              if (idx >= 0) {
                state.selectedComponentIds.splice(idx, 1);
              } else {
                state.selectedComponentIds.push(id);
              }
            } else {
              state.selectedComponentIds = [id];
            }
          });
        },

        selectAll: () => {
          set((state) => {
            function collectIds(comps: LabelComponent[]): string[] {
              const ids: string[] = [];
              for (const c of comps) {
                ids.push(c.id);
                if (c.children) ids.push(...collectIds(c.children));
              }
              return ids;
            }
            state.selectedComponentIds = collectIds(state.document.components);
          });
        },

        setZoom: (zoom) => {
          set((state) => { state.viewport.zoom = zoom; });
        },

        setPan: (x, y) => {
          set((state) => { state.viewport.panX = x; state.viewport.panY = y; });
        },

        setViewport: (zoom, panX, panY) => {
          set((state) => { state.viewport.zoom = zoom; state.viewport.panX = panX; state.viewport.panY = panY; });
        },

        setInteractionMode: (mode) => {
          set((state) => { state.interactionMode = mode; });
        },

        setDragState: (dragState) => {
          const prev = get().dragState;
          if (dragState && !prev) {
            enterUndoBatch(set, get);
          } else if (!dragState && prev) {
            exitUndoBatch(set, get);
          }
          set((state) => { state.dragState = dragState; });
        },

        setResizeState: (resizeState) => {
          const prev = get().resizeState;
          if (resizeState && !prev) {
            enterUndoBatch(set, get);
          } else if (!resizeState && prev) {
            exitUndoBatch(set, get);
          }
          set((state) => { state.resizeState = resizeState; });
        },

        setPaletteDropState: (paletteDropState) => {
          set((state) => { state.paletteDropState = paletteDropState; });
        },

        updateLabelConfig: (config) => {
          set((state) => { Object.assign(state.document.label, config); });
        },

        toggleGrid: () => {
          set((state) => { state.showGrid = !state.showGrid; });
        },

        loadDocument: (doc) => {
          cancelThrottledHandleSet?.();
          getTemporalState().pause();
          set((state) => {
            state.document = doc;
            state.selectedComponentIds = [];
            state._undoBatchSnapshot = null;
          });
          getTemporalState().clear();
          getTemporalState().resume();
        },

        resetDocument: () => {
          cancelThrottledHandleSet?.();
          getTemporalState().pause();
          set(() => ({ ...initialState, _undoBatchSnapshot: null }));
          getTemporalState().clear();
          getTemporalState().resume();
        },

        setLabelMeta: (id, name) => {
          set((state) => { state.currentLabelId = id; state.currentLabelName = name; });
        },
      })),
      {
        partialize: (state) => ({ document: state.document }),
        equality: (past, current) =>
          JSON.stringify(past.document) === JSON.stringify(current.document),
        handleSet: (handleSet) => {
          let timer: ReturnType<typeof setTimeout> | null = null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let lastArgs: any[] | null = null;
          const THROTTLE_MS = UNDO_THROTTLE_MS;

          cancelThrottledHandleSet = () => {
            if (timer) { clearTimeout(timer); timer = null; }
            lastArgs = null;
          };

          return ((...args: unknown[]) => {
            lastArgs = args;
            if (!timer) {
              (handleSet as (...a: unknown[]) => void)(...args);
              timer = setTimeout(() => {
                timer = null;
                if (lastArgs) {
                  (handleSet as (...a: unknown[]) => void)(...lastArgs);
                }
              }, THROTTLE_MS);
            }
          }) as typeof handleSet;
        },
        limit: 100,
      }
    )
  );

  storeRef = store;
  return store;
}

// Default singleton — used during migration and in tests.
// Components should prefer the context-based hooks from editor-context.tsx.
export const useEditorStore = createEditorStore();

/** Pause undo tracking on a store instance */
export function pauseTracking(store?: EditorStoreApi) {
  (store ?? useEditorStore).temporal.getState().pause();
}

/** Resume undo tracking on a store instance */
export function resumeTracking(store?: EditorStoreApi) {
  (store ?? useEditorStore).temporal.getState().resume();
}
