import type { LabelVariable } from '../../types';
import type { EditorStore } from '../editor-store';
import type { ImmerSet } from '../undo';

export function createVariableActions(set: ImmerSet<EditorStore>) {
  return {
    addVariable: (variable: LabelVariable) => {
      set((state) => {
        if (!state.document.variables) state.document.variables = [];
        state.document.variables.push(variable);
      });
    },

    updateVariable: (name: string, updates: Partial<LabelVariable>) => {
      set((state) => {
        const vars = state.document.variables;
        if (!vars) return;
        const idx = vars.findIndex((v) => v.name === name);
        if (idx === -1) return;
        Object.assign(vars[idx], updates);
      });
    },

    removeVariable: (name: string) => {
      set((state) => {
        if (!state.document.variables) return;
        state.document.variables = state.document.variables.filter((v) => v.name !== name);
      });
    },
  };
}
