import type { EditorState } from '../../types';
import type { EditorStore } from '../editor-store';
import type { ImmerSet, StoreGet } from '../undo';
import type { UndoController } from '../undo';

export function createViewportActions(set: ImmerSet<EditorStore>) {
  return {
    setZoom: (zoom: number) => {
      set((state) => { state.viewport.zoom = zoom; });
    },

    setPan: (x: number, y: number) => {
      set((state) => { state.viewport.panX = x; state.viewport.panY = y; });
    },

    setViewport: (zoom: number, panX: number, panY: number) => {
      set((state) => { state.viewport.zoom = zoom; state.viewport.panX = panX; state.viewport.panY = panY; });
    },
  };
}

export function createInteractionActions(
  set: ImmerSet<EditorStore>,
  get: StoreGet<EditorStore>,
  undo: UndoController
) {
  return {
    setInteractionMode: (mode: EditorState['interactionMode']) => {
      set((state) => { state.interactionMode = mode; });
    },

    setDragState: (dragState: EditorState['dragState']) => {
      const prev = get().dragState;
      if (dragState && !prev) {
        undo.enterUndoBatch(set, get);
      } else if (!dragState && prev) {
        undo.exitUndoBatch(set, get);
      }
      set((state) => { state.dragState = dragState; });
    },

    setResizeState: (resizeState: EditorState['resizeState']) => {
      const prev = get().resizeState;
      if (resizeState && !prev) {
        undo.enterUndoBatch(set, get);
      } else if (!resizeState && prev) {
        undo.exitUndoBatch(set, get);
      }
      set((state) => { state.resizeState = resizeState; });
    },

    setPaletteDropState: (paletteDropState: EditorState['paletteDropState']) => {
      set((state) => { state.paletteDropState = paletteDropState; });
    },
  };
}
