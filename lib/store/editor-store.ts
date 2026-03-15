import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
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
};

// Helper to find and operate on a component within the tree
function findComponent(
  components: LabelComponent[],
  id: string
): LabelComponent | null {
  for (const comp of components) {
    if (comp.id === id) return comp;
    if (comp.children) {
      const found = findComponent(comp.children, id);
      if (found) return found;
    }
  }
  return null;
}

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
}

export type EditorStore = EditorState & EditorActions;

export const useEditorStore = create<EditorStore>()(
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
  }))
);
