import type { LabelConfig } from '../../types';
import type { LabelSizeVariant } from '../../types';
import type { EditorStore } from '../editor-store';
import type { ImmerSet } from '../undo';

export function createLabelConfigActions(set: ImmerSet<EditorStore>) {
  return {
    updateLabelConfig: (config: Partial<LabelConfig>) => {
      set((state) => { Object.assign(state.document.label, config); });
    },

    setActiveVariant: (name: string) => {
      set((state) => {
        const exists = state.document.label.variants.some((v) => v.name === name);
        if (exists) state.activeVariant = name;
      });
    },

    addVariant: (variant: LabelSizeVariant) => {
      set((state) => {
        state.document.label.variants.push(variant);
      });
    },

    updateVariant: (name: string, updates: Partial<Omit<LabelSizeVariant, 'name'>>) => {
      set((state) => {
        const variant = state.document.label.variants.find((v) => v.name === name);
        if (variant) Object.assign(variant, updates);
      });
    },

    renameVariant: (oldName: string, newName: string) => {
      set((state) => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        const variants = state.document.label.variants;
        if (variants.some((v) => v.name === trimmed && v.name !== oldName)) return;
        const variant = variants.find((v) => v.name === oldName);
        if (!variant) return;
        variant.name = trimmed;
        if (state.activeVariant === oldName) {
          state.activeVariant = trimmed;
        }
      });
    },

    removeVariant: (name: string) => {
      set((state) => {
        const variants = state.document.label.variants;
        if (variants.length <= 1) return;
        const idx = variants.findIndex((v) => v.name === name);
        if (idx === -1) return;
        variants.splice(idx, 1);
        if (state.activeVariant === name) {
          state.activeVariant = variants[0].name;
        }
      });
    },
  };
}
