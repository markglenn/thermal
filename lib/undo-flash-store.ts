import { useSyncExternalStore } from 'react';

let flashIds: Set<string> = new Set();
const listeners: Set<() => void> = new Set();
let timeoutId: ReturnType<typeof setTimeout> | null = null;

function notify() {
  for (const l of listeners) l();
}

export function getFlashIds(): Set<string> {
  return flashIds;
}

export function setFlashIds(ids: string[]) {
  if (timeoutId) clearTimeout(timeoutId);
  flashIds = new Set(ids);
  notify();
  timeoutId = setTimeout(() => {
    flashIds = new Set();
    notify();
  }, 600);
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

const emptySet = new Set<string>();

export function useFlashIds(): Set<string> {
  return useSyncExternalStore(subscribe, getFlashIds, () => emptySet);
}
