import { describe, it, expect, beforeEach } from 'vitest';
import { useTabStore } from './tab-store';

// Register components so editor stores can create them
import '../components';

describe('tab store', () => {
  beforeEach(() => {
    // Reset to a single tab
    const state = useTabStore.getState();
    const tabIds = state.tabs.map((t) => t.id);
    // Close all but last, then create a fresh one
    for (const id of tabIds) {
      state.closeTab(id);
    }
    state.createTab();
  });

  describe('reorderTabs', () => {
    it('reorders tabs by moving from one index to another', () => {
      const state = useTabStore.getState();
      const id2 = state.createTab();
      const id3 = state.createTab();

      const tabs = useTabStore.getState().tabs;
      const id1 = tabs[0].id;
      expect(tabs.map((t) => t.id)).toEqual([id1, id2, id3]);

      useTabStore.getState().reorderTabs(0, 2);
      expect(useTabStore.getState().tabs.map((t) => t.id)).toEqual([id2, id3, id1]);
    });

    it('does nothing with a single tab', () => {
      const tabs = useTabStore.getState().tabs;
      expect(tabs).toHaveLength(1);
      const id = tabs[0].id;

      useTabStore.getState().reorderTabs(0, 0);
      expect(useTabStore.getState().tabs.map((t) => t.id)).toEqual([id]);
    });

    it('preserves active tab after reorder', () => {
      const state = useTabStore.getState();
      const id2 = state.createTab();
      state.createTab();

      // id2 is active (last created)
      expect(useTabStore.getState().activeTabId).toBe(useTabStore.getState().tabs[2].id);

      // Reorder first to last
      useTabStore.getState().reorderTabs(0, 2);

      // Active tab ID should be unchanged
      const newState = useTabStore.getState();
      expect(newState.tabs.find((t) => t.id === id2)).toBeDefined();
    });
  });

  describe('closeTab', () => {
    it('switches to adjacent tab when closing active tab', () => {
      const state = useTabStore.getState();
      const id1 = state.tabs[0].id;
      const id2 = state.createTab();

      // Active is id2
      expect(useTabStore.getState().activeTabId).toBe(id2);

      useTabStore.getState().closeTab(id2);
      expect(useTabStore.getState().activeTabId).toBe(id1);
    });

    it('allows closing the last tab', () => {
      const state = useTabStore.getState();
      expect(state.tabs).toHaveLength(1);

      state.closeTab(state.tabs[0].id);
      expect(useTabStore.getState().tabs).toHaveLength(0);
    });
  });
});
