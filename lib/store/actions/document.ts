import type { LabelDocument } from '../../types';
import { migrateLabelConfig } from '../../constants';
import { migrateDocument } from '@/lib/constraints/migrate';
import { recomputeAllSizes } from '@/lib/components/recompute-size';
import type { EditorStore } from '../editor-store';
import type { ImmerSet, UndoController } from '../undo';
import { initialState } from '../editor-store';

/**
 * Prepare a document for loading: clone, migrate, and recompute sizes.
 * Returns the prepared document and extracted activeVariant.
 * Does NOT mutate the input document.
 */
export function prepareDocument(doc: LabelDocument): { document: LabelDocument; activeVariant: string } {
  const cloned = structuredClone(doc);
  migrateDocument(cloned.components);
  const migrated = migrateLabelConfig(cloned.label as unknown as Record<string, unknown>);
  cloned.label = migrated.label;
  recomputeAllSizes(cloned.components);
  return { document: cloned, activeVariant: migrated.activeVariant };
}

export function createDocumentActions(set: ImmerSet<EditorStore>, undo: UndoController) {
  return {
    loadDocument: (doc: LabelDocument) => {
      const { document, activeVariant } = prepareDocument(doc);
      undo.cancelPending();
      undo.pause();
      set((state) => {
        state.document = document;
        state.activeVariant = activeVariant;
        state.selectedComponentIds = [];
        state._undoBatchSnapshot = null;
      });
      undo.clearAndResume();
    },

    resetDocument: () => {
      undo.cancelPending();
      undo.pause();
      set(() => ({ ...initialState, _undoBatchSnapshot: null }));
      undo.clearAndResume();
    },
  };
}
