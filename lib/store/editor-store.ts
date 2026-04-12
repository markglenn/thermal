import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import type {
  EditorState,
  LabelDocument,
  LabelComponent,
  LabelVariable,
  ComponentLayout,
  ComponentType,
  LabelConfig,
  RfidConfig,
  HorizontalAnchor,
  VerticalAnchor,
  VisibilityCondition,
} from '../types';
import { DEFAULT_LABEL, DEFAULT_ACTIVE_VARIANT, DEFAULT_ZOOM, GRID_SIZE } from '../constants';
import { createUndoController } from './undo';
import { createComponentActions } from './actions/components';
import { createSelectionActions } from './actions/selection';
import { createViewportActions, createInteractionActions } from './actions/viewport';
import { createLabelConfigActions } from './actions/label-config';
import { createVariableActions } from './actions/variables';
import { createDocumentActions } from './actions/document';
import type { LabelSizeVariant } from '../types';

const initialDocument: LabelDocument = {
  version: 1,
  label: { ...DEFAULT_LABEL },
  components: [],
};

export const initialState: EditorState = {
  document: initialDocument,
  activeVariant: DEFAULT_ACTIVE_VARIANT,
  selectedComponentIds: [],
  viewport: { zoom: DEFAULT_ZOOM, panX: 0, panY: 0 },
  interactionMode: 'select',
  dragState: null,
  resizeState: null,
  paletteDropState: null,
  showGrid: true,
  showRulers: true,
  gridSize: GRID_SIZE,
  currentLabelId: null,
  currentLabelName: null,
  readOnly: false,
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
  updateVisibilityCondition: (id: string, condition: VisibilityCondition | undefined) => void;
  toggleLock: (id: string, axis: 'x' | 'y') => void;

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
  updateRfidConfig: (config: Partial<RfidConfig>) => void;
  setActiveVariant: (name: string) => void;
  addVariant: (variant: LabelSizeVariant) => void;
  updateVariant: (name: string, updates: Partial<Omit<LabelSizeVariant, 'name'>>) => void;
  renameVariant: (oldName: string, newName: string) => void;
  removeVariant: (name: string) => void;

  // Grid & Rulers
  toggleGrid: () => void;
  toggleRulers: () => void;

  // Document
  loadDocument: (doc: LabelDocument) => void;
  resetDocument: () => void;

  // Variables
  addVariable: (variable: LabelVariable) => void;
  updateVariable: (name: string, variable: Partial<LabelVariable>) => void;
  removeVariable: (name: string) => void;

  // Label persistence
  setLabelMeta: (id: string | null, name: string | null) => void;
  setReadOnly: (readOnly: boolean) => void;
}

export type EditorStore = EditorState & EditorActions & {
  /** Internal: snapshot captured at drag/resize start, flushed as a single undo entry on end */
  _undoBatchSnapshot: { document: LabelDocument } | null;
};

// The store type including temporal (undo/redo) capabilities
export type EditorStoreApi = ReturnType<typeof createEditorStore>;

/** Factory function — creates an independent editor store with its own undo history. */
export function createEditorStore() {
  const undo = createUndoController();

  const store = create<EditorStore>()(
    temporal(
      immer((set, get) => ({
        ...initialState,
        _undoBatchSnapshot: null,

        // Component CRUD
        ...createComponentActions(set, get),

        // Selection
        ...createSelectionActions(set),

        // Viewport & interaction
        ...createViewportActions(set),
        ...createInteractionActions(set, get, undo),

        // Label settings & variants
        ...createLabelConfigActions(set),

        // Grid & Rulers
        toggleGrid: () => { set((state) => { state.showGrid = !state.showGrid; }); },
        toggleRulers: () => { set((state) => { state.showRulers = !state.showRulers; }); },

        // Document lifecycle
        ...createDocumentActions(set, undo),

        // Variables
        ...createVariableActions(set),

        // Label persistence
        setLabelMeta: (id, name) => {
          set((state) => { state.currentLabelId = id; state.currentLabelName = name; });
        },
        setReadOnly: (readOnly) => {
          set((state) => { state.readOnly = readOnly; });
        },
      })),
      {
        partialize: (state) => ({ document: state.document }),
        equality: (past, current) => past.document === current.document,
        handleSet: (handleSet) => {
          return undo.createThrottledHandleSet(handleSet as (...args: unknown[]) => void) as typeof handleSet;
        },
        limit: 100,
      }
    )
  );

  undo.setTemporalRef(store.temporal);
  return store;
}
