import type { LabelDocument } from '../types';
import { UNDO_THROTTLE_MS } from '../constants';

/**
 * Types shared between the undo module and the store.
 * ImmerSet is the Zustand immer-style set function.
 */
export type ImmerSet<T> = (fn: (state: T) => void) => void;
export type StoreGet<T> = () => T;

export interface UndoBatchState {
  _undoBatchSnapshot: { document: LabelDocument } | null;
}

export interface TemporalApi {
  getState: () => {
    pause: () => void;
    resume: () => void;
    clear: () => void;
    undo: () => void;
    redo: () => void;
    pastStates: unknown[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setState: (state: { pastStates: any[] }) => void;
}

/**
 * Create a per-store undo controller. Each editor store instance gets its own
 * controller with closure-scoped state for throttle cancellation and temporal access.
 */
export function createUndoController() {
  let cancelThrottledHandleSet: (() => void) | null = null;
  let temporalRef: TemporalApi | null = null;

  function setTemporalRef(ref: TemporalApi) {
    temporalRef = ref;
  }

  function getTemporalState() {
    if (!temporalRef) throw new Error('Store not initialized — temporal accessed before createEditorStore completed');
    return temporalRef.getState();
  }

  function enterUndoBatch<T extends UndoBatchState>(set: ImmerSet<T>, get: StoreGet<T & { document: LabelDocument }>) {
    getTemporalState().pause();
    set((state) => {
      state._undoBatchSnapshot = { document: get().document };
    });
  }

  function exitUndoBatch<T extends UndoBatchState>(set: ImmerSet<T>, get: StoreGet<T>) {
    const snapshot = get()._undoBatchSnapshot;
    set((state) => {
      state._undoBatchSnapshot = null;
    });
    getTemporalState().resume();
    if (snapshot) {
      const { pastStates } = getTemporalState();
      temporalRef!.setState({ pastStates: [...pastStates, snapshot] });
    }
  }

  /** Pause temporal so the next set() call won't create an undo entry. */
  function pause() {
    getTemporalState().pause();
  }

  /** Clear history and resume temporal. Call after the set() that loads new state. */
  function clearAndResume() {
    getTemporalState().clear();
    getTemporalState().resume();
  }

  /** Cancel any pending throttled handleSet. Called before load/reset. */
  function cancelPending() {
    cancelThrottledHandleSet?.();
  }

  /**
   * Temporal handleSet option — throttles history pushes to collapse rapid
   * state changes (e.g. typing, slider drags) into single undo entries.
   */
  function createThrottledHandleSet(handleSet: (...args: unknown[]) => void) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastArgs: any[] | null = null;

    cancelThrottledHandleSet = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      lastArgs = null;
    };

    return (...args: unknown[]) => {
      lastArgs = args;
      if (!timer) {
        handleSet(...args);
        timer = setTimeout(() => {
          timer = null;
          if (lastArgs) {
            handleSet(...lastArgs);
          }
        }, UNDO_THROTTLE_MS);
      }
    };
  }

  return {
    setTemporalRef,
    enterUndoBatch,
    exitUndoBatch,
    pause,
    clearAndResume,
    cancelPending,
    createThrottledHandleSet,
  };
}

export type UndoController = ReturnType<typeof createUndoController>;
