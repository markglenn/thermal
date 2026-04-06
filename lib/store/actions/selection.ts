import type { EditorStore } from '../editor-store';
import type { ImmerSet } from '../undo';

export function createSelectionActions(set: ImmerSet<EditorStore>) {
  return {
    selectComponent: (id: string | null, opts?: { toggle?: boolean }) => {
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
  };
}
