import { useEffect } from 'react';
import { useEditorStoreApi } from '@/lib/store/editor-context';
import { setFlashIds } from '@/lib/undo-flash-store';
import type { LabelComponent } from '@/lib/types';

/** Find component IDs that were added or modified between two arrays. */
function diffComponents(prev: LabelComponent[], next: LabelComponent[]): string[] {
  const changed: string[] = [];
  const prevMap = new Map(prev.map((c) => [c.id, c]));

  for (const comp of next) {
    if (prevMap.get(comp.id) !== comp) changed.push(comp.id);
  }
  return changed;
}

export function useUndoFlash() {
  const storeApi = useEditorStoreApi();

  useEffect(() => {
    const temporal = storeApi.temporal;
    const origUndo = temporal.getState().undo;
    const origRedo = temporal.getState().redo;

    const wrapUndoRedo = (fn: (steps?: number) => void) => (steps?: number) => {
      const before = storeApi.getState().document.components;
      fn(steps);
      const after = storeApi.getState().document.components;
      if (before !== after) {
        const changed = diffComponents(before, after);
        if (changed.length > 0) {
          setFlashIds(changed);
        }
      }
    };

    temporal.setState({ undo: wrapUndoRedo(origUndo), redo: wrapUndoRedo(origRedo) });

    return () => {
      temporal.setState({ undo: origUndo, redo: origRedo });
    };
  }, [storeApi]);
}
