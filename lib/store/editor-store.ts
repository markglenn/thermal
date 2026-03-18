import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { current } from 'immer';
import { temporal } from 'zundo';
import type {
  EditorState,
  LabelDocument,
  LabelComponent,
  ComponentLayout,
  ComponentType,
  LabelConfig,
  HorizontalAnchor,
  VerticalAnchor,
} from '../types';
import { DEFAULT_LABEL, DEFAULT_ZOOM, GRID_SIZE, DUPLICATE_OFFSET, UNDO_THROTTLE_MS, labelWidthDots, labelHeightDots } from '../constants';
import { createComponent, generateId } from './editor-actions';
import { findComponent } from '@/lib/utils';
import { resolveLayout } from '@/lib/constraints/resolver';
import { recomputeContentSize, recomputeAllSizes } from '@/lib/components/recompute-size';
import { migrateDocument } from '@/lib/constraints/migrate';

/** Offset a layout by `amount` in the visual "down-right" direction, respecting anchor. */
function offsetForAnchor(layout: ComponentLayout, amount: number) {
  // For right/bottom anchored components, increasing x/y moves them toward
  // the anchor edge (visually left/up). Subtract to move visually down-right.
  layout.x += layout.horizontalAnchor === 'right' ? -amount : amount;
  layout.y += layout.verticalAnchor === 'bottom' ? -amount : amount;
}

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

export interface EditorActions {
  // Component CRUD
  addComponent: (type: ComponentType, layoutOverrides?: Partial<ComponentLayout>) => string;
  removeComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  pasteComponents: (components: LabelComponent[]) => string[];
  updateLayout: (id: string, layout: Partial<ComponentLayout>) => void;
  updateMultipleLayouts: (updates: { id: string; layout: Partial<ComponentLayout> }[]) => void;
  updateProperties: (id: string, props: Record<string, unknown>) => void;
  renameComponent: (id: string, name: string) => void;
  setAnchor: (id: string, horizontal?: HorizontalAnchor, vertical?: VerticalAnchor) => void;
  reorderComponents: (fromIndex: number, toIndex: number) => void;
  updateFieldBinding: (id: string, binding: string | undefined) => void;

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

        addComponent: (type, layoutOverrides) => {
          const comp = createComponent(type, layoutOverrides);
          recomputeContentSize(comp);
          set((state) => {
            state.document.components.push(comp);
            state.selectedComponentIds = [comp.id];
          });
          return comp.id;
        },

        removeComponent: (id) => {
          set((state) => {
            const idx = state.document.components.findIndex((c) => c.id === id);
            if (idx !== -1) state.document.components.splice(idx, 1);
            state.selectedComponentIds = state.selectedComponentIds.filter((sid) => sid !== id);
          });
        },

        duplicateComponent: (id) => {
          set((state) => {
            const comps = state.document.components;
            const idx = comps.findIndex((c) => c.id === id);
            if (idx === -1) return;
            const original = comps[idx];
            const cloned = structuredClone(current(original)) as LabelComponent;
            cloned.id = generateId();
            cloned.name = cloned.name + ' Copy';
            offsetForAnchor(cloned.layout, DUPLICATE_OFFSET);
            comps.splice(idx + 1, 0, cloned);
            state.selectedComponentIds = [cloned.id];
          });
        },

        pasteComponents: (components) => {
          const clones = components.map((c) => {
            const cloned = structuredClone(c);
            cloned.id = generateId();
            offsetForAnchor(cloned.layout, DUPLICATE_OFFSET);
            return cloned;
          });
          set((state) => {
            state.document.components.push(...clones);
            state.selectedComponentIds = clones.map((c) => c.id);
          });
          return clones.map((c) => c.id);
        },

        updateLayout: (id, layout) => {
          set((state) => {
            const comp = findComponent(state.document.components, id);
            if (!comp) return;
            Object.assign(comp.layout, layout);
            // If width changed, recompute height for width-only components
            if (layout.width !== undefined) {
              recomputeContentSize(comp);
            }
          });
        },

        updateMultipleLayouts: (updates) => {
          set((state) => {
            for (const { id, layout } of updates) {
              const comp = findComponent(state.document.components, id);
              if (!comp) continue;
              Object.assign(comp.layout, layout);
              if (layout.width !== undefined) {
                recomputeContentSize(comp);
              }
            }
          });
        },

        updateProperties: (id, props) => {
          set((state) => {
            const comp = findComponent(state.document.components, id);
            if (comp) {
              Object.assign(comp.typeData.props, props);
              recomputeContentSize(comp);
            }
          });
        },

        renameComponent: (id, name) => {
          set((state) => {
            const comp = findComponent(state.document.components, id);
            if (comp) comp.name = name;
          });
        },

        updateFieldBinding: (id, binding) => {
          set((state) => {
            const comp = findComponent(state.document.components, id);
            if (comp) {
              if (binding) {
                comp.fieldBinding = binding;
              } else {
                delete comp.fieldBinding;
              }
            }
          });
        },

        setAnchor: (id, horizontal, vertical) => {
          const currentState = get();
          const currentComp = findComponent(currentState.document.components, id);
          if (!currentComp) return;

          // Resolve the current visual position so we can recompute x/y
          // to keep the component in the same place after anchor change
          const { label } = currentState.document;
          const lw = labelWidthDots(label);
          const lh = labelHeightDots(label);
          const bounds = resolveLayout(currentComp.layout, lw, lh);

          set((state) => {
            const comp = findComponent(state.document.components, id);
            if (!comp) return;

            if (horizontal !== undefined && horizontal !== comp.layout.horizontalAnchor) {
              comp.layout.horizontalAnchor = horizontal;
              // Recompute x to keep same visual position
              if (horizontal === 'right') {
                comp.layout.x = Math.max(0, lw - bounds.x - bounds.width);
              } else {
                comp.layout.x = bounds.x;
              }
            }

            if (vertical !== undefined && vertical !== comp.layout.verticalAnchor) {
              comp.layout.verticalAnchor = vertical;
              // Recompute y to keep same visual position
              if (vertical === 'bottom') {
                comp.layout.y = Math.max(0, lh - bounds.y - bounds.height);
              } else {
                comp.layout.y = bounds.y;
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
            state.selectedComponentIds = state.document.components.map((c) => c.id);
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
          // Migrate legacy constraints/pins to layout model
          migrateDocument(doc.components);
          // Recompute sizes for auto/width-only components
          recomputeAllSizes(doc.components);
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
