import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import type {
  EditorState,
  LabelDocument,
  LabelComponent,
  Constraints,
  ComponentType,
  LabelConfig,
} from '../types';
import { DEFAULT_LABEL, DEFAULT_ZOOM, GRID_SIZE } from '../constants';
import { createComponent, generateId } from './editor-actions';
import { findComponent } from '@/lib/utils';

const initialDocument: LabelDocument = {
  version: 1,
  label: { ...DEFAULT_LABEL },
  components: [],
};

const initialState: EditorState = {
  document: initialDocument,
  selectedComponentId: null,
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
  addComponentToContainer: (containerId: string, type: ComponentType, constraintOverrides?: Partial<Constraints>) => string;
  removeComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  updateConstraints: (id: string, constraints: Partial<Constraints>) => void;
  updateProperties: (id: string, props: Record<string, unknown>) => void;
  renameComponent: (id: string, name: string) => void;
  togglePin: (id: string, edge: import('../types').PinnableEdge) => void;
  reorderComponents: (fromIndex: number, toIndex: number) => void;
  reparentComponent: (id: string, newParentId: string | null) => void;

  // Selection
  selectComponent: (id: string | null) => void;

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

export type EditorStore = EditorState & EditorActions;

// Throttle wrapper for zundo's handleSet — collapses rapid state changes into one history entry
function throttledHandleSet<T>(
  handleSet: (state: T) => void
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastArgs: any[] | null = null;
  const THROTTLE_MS = 500;

  return (...args: unknown[]) => {
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
  };
}

export const useEditorStore = create<EditorStore>()(
  temporal(
    immer((set, get) => ({
      ...initialState,

      addComponent: (type, constraintOverrides) => {
        const comp = createComponent(type, constraintOverrides);
        set((state) => {
          state.document.components.push(comp);
          state.selectedComponentId = comp.id;
        });
        return comp.id;
      },

      addComponentToContainer: (containerId, type, constraintOverrides) => {
        const comp = createComponent(type, constraintOverrides);
        set((state) => {
          const container = findComponent(state.document.components, containerId);
          if (container && container.children) {
            container.children.push(comp);
            state.selectedComponentId = comp.id;
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
          if (state.selectedComponentId === id) {
            state.selectedComponentId = null;
          }
        });
      },

      duplicateComponent: (id) => {
        set((state) => {
          const parent = findParentArray(state.document.components, id);
          if (!parent) return;
          const idx = parent.findIndex((c) => c.id === id);
          if (idx === -1) return;
          const original = parent[idx];
          // Deep clone and assign new IDs
          const cloned = JSON.parse(JSON.stringify(original)) as LabelComponent;
          function reassignIds(comp: LabelComponent) {
            comp.id = generateId();
            comp.name = comp.name + ' Copy';
            if (comp.children) comp.children.forEach(reassignIds);
          }
          reassignIds(cloned);
          // Offset slightly
          if (cloned.constraints.left !== undefined) cloned.constraints.left += 20;
          if (cloned.constraints.top !== undefined) cloned.constraints.top += 20;
          parent.splice(idx + 1, 0, cloned);
          state.selectedComponentId = cloned.id;
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
        // Compute pin value before mutating so we don't need imports inside immer
        const currentState = get();
        const currentComp = findComponent(currentState.document.components, id);
        if (!currentComp) return;

        const alreadyPinned = currentComp.pins.includes(edge);

        let pinValue = 0;
        if (!alreadyPinned && currentComp.constraints[edge] === undefined) {
          // Compute from resolved bounds so component doesn't jump
          const { label } = currentState.document;
          const lw = Math.round(label.widthInches * label.dpi);
          const lh = Math.round(label.heightInches * label.dpi);

          // Simple resolve for this component to get current position
          const c = currentComp.constraints;
          const resolveH = () => {
            if (c.left !== undefined && c.right !== undefined) return { x: c.left, w: lw - c.left - c.right };
            if (c.left !== undefined && c.width !== undefined) return { x: c.left, w: c.width };
            if (c.right !== undefined && c.width !== undefined) return { x: lw - c.right - c.width, w: c.width };
            if (c.width !== undefined) return { x: Math.round((lw - c.width) / 2), w: c.width };
            if (c.left !== undefined) return { x: c.left, w: 100 };
            return { x: 0, w: 100 };
          };
          const resolveV = () => {
            if (c.top !== undefined && c.bottom !== undefined) return { y: c.top, h: lh - c.top - c.bottom };
            if (c.top !== undefined && c.height !== undefined) return { y: c.top, h: c.height };
            if (c.bottom !== undefined && c.height !== undefined) return { y: lh - c.bottom - c.height, h: c.height };
            if (c.height !== undefined) return { y: Math.round((lh - c.height) / 2), h: c.height };
            if (c.top !== undefined) return { y: c.top, h: 40 };
            return { y: 0, h: 40 };
          };

          const h = resolveH();
          const v = resolveV();

          switch (edge) {
            case 'left': pinValue = h.x; break;
            case 'top': pinValue = v.y; break;
            case 'right': pinValue = Math.max(0, lw - h.x - h.w); break;
            case 'bottom': pinValue = Math.max(0, lh - v.y - v.h); break;
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
          // Remove from current parent
          const currentParent = findParentArray(state.document.components, id);
          if (!currentParent) return;
          const idx = currentParent.findIndex((c) => c.id === id);
          if (idx === -1) return;
          const [comp] = currentParent.splice(idx, 1);

          // Add to new parent
          if (newParentId === null) {
            state.document.components.push(comp);
          } else {
            const newParent = findComponent(state.document.components, newParentId);
            if (newParent && newParent.children) {
              newParent.children.push(comp);
            } else {
              // If target isn't a container, put back at root
              state.document.components.push(comp);
            }
          }
        });
      },

      selectComponent: (id) => {
        set((state) => {
          state.selectedComponentId = id;
        });
      },

      setZoom: (zoom) => {
        set((state) => {
          state.viewport.zoom = zoom;
        });
      },

      setPan: (x, y) => {
        set((state) => {
          state.viewport.panX = x;
          state.viewport.panY = y;
        });
      },

      setViewport: (zoom, panX, panY) => {
        set((state) => {
          state.viewport.zoom = zoom;
          state.viewport.panX = panX;
          state.viewport.panY = panY;
        });
      },

      setInteractionMode: (mode) => {
        set((state) => {
          state.interactionMode = mode;
        });
      },

      setDragState: (dragState) => {
        set((state) => {
          state.dragState = dragState;
        });
      },

      setResizeState: (resizeState) => {
        set((state) => {
          state.resizeState = resizeState;
        });
      },

      setPaletteDropState: (paletteDropState) => {
        set((state) => {
          state.paletteDropState = paletteDropState;
        });
      },

      updateLabelConfig: (config) => {
        set((state) => {
          Object.assign(state.document.label, config);
        });
      },

      toggleGrid: () => {
        set((state) => {
          state.showGrid = !state.showGrid;
        });
      },

      loadDocument: (doc) => {
        set((state) => {
          state.document = doc;
          state.selectedComponentId = null;
        });
      },

      resetDocument: () => {
        set(() => ({ ...initialState }));
      },

      setLabelMeta: (id, name) => {
        set((state) => {
          state.currentLabelId = id;
          state.currentLabelName = name;
        });
      },
    })),
    {
      // Only track the document — not viewport, selection, drag/resize state
      partialize: (state) => ({ document: state.document }),
      // Compare serialized document to detect actual changes
      equality: (past, current) =>
        JSON.stringify(past.document) === JSON.stringify(current.document),
      // Throttle so drag/resize produces one history entry per 500ms
      handleSet: (handleSet) => throttledHandleSet(handleSet) as typeof handleSet,
      // Keep up to 100 undo steps
      limit: 100,
    }
  )
);

/** Pause undo tracking (call before continuous edits like typing) */
export function pauseTracking() {
  useEditorStore.temporal.getState().pause();
}

/** Resume undo tracking (call when editing ends, e.g. on blur) */
export function resumeTracking() {
  useEditorStore.temporal.getState().resume();
}
