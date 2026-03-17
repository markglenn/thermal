import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useEditorStore } from './editor-store';
import type { LabelDocument } from '../types';

// Register all components so createComponent can look them up
import '../components';

function resetStore() {
  useEditorStore.getState().resetDocument();
}

describe('editor store', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('addComponent', () => {
    it('adds a component to the document', () => {
      const id = useEditorStore.getState().addComponent('text');
      const components = useEditorStore.getState().document.components;
      expect(components).toHaveLength(1);
      expect(components[0].id).toBe(id);
      expect(components[0].typeData.type).toBe('text');
    });

    it('selects the new component', () => {
      const id = useEditorStore.getState().addComponent('rectangle');
      expect(useEditorStore.getState().selectedComponentIds).toEqual([id]);
    });

    it('applies constraint overrides', () => {
      useEditorStore.getState().addComponent('text', { left: 99, top: 77 });
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.constraints.left).toBe(99);
      expect(comp.constraints.top).toBe(77);
    });
  });

  describe('addComponentToContainer', () => {
    it('adds a component inside a container', () => {
      const containerId = useEditorStore.getState().addComponent('container');
      const childId = useEditorStore.getState().addComponentToContainer(containerId, 'text');
      const container = useEditorStore.getState().document.components[0];
      expect(container.children).toHaveLength(1);
      expect(container.children![0].id).toBe(childId);
    });

    it('selects the child component', () => {
      const containerId = useEditorStore.getState().addComponent('container');
      const childId = useEditorStore.getState().addComponentToContainer(containerId, 'text');
      expect(useEditorStore.getState().selectedComponentIds).toEqual([childId]);
    });

    it('returns null if container does not exist', () => {
      const result = useEditorStore.getState().addComponentToContainer('nonexistent', 'text');
      expect(result).toBeNull();
      expect(useEditorStore.getState().document.components).toHaveLength(0);
    });

    it('returns null if target is not a container', () => {
      const rectId = useEditorStore.getState().addComponent('rectangle');
      const result = useEditorStore.getState().addComponentToContainer(rectId, 'text');
      expect(result).toBeNull();
      // Only the rectangle should exist, no orphaned text
      expect(useEditorStore.getState().document.components).toHaveLength(1);
    });
  });

  describe('removeComponent', () => {
    it('removes a component from the document', () => {
      const id = useEditorStore.getState().addComponent('text');
      useEditorStore.getState().removeComponent(id);
      expect(useEditorStore.getState().document.components).toHaveLength(0);
    });

    it('clears selection if removed component was selected', () => {
      const id = useEditorStore.getState().addComponent('text');
      expect(useEditorStore.getState().selectedComponentIds).toEqual([id]);
      useEditorStore.getState().removeComponent(id);
      expect(useEditorStore.getState().selectedComponentIds).toEqual([]);
    });

    it('does not clear selection if a different component was removed', () => {
      const id1 = useEditorStore.getState().addComponent('text');
      const id2 = useEditorStore.getState().addComponent('rectangle');
      // id2 is selected (most recently added)
      useEditorStore.getState().removeComponent(id1);
      expect(useEditorStore.getState().selectedComponentIds).toEqual([id2]);
    });
  });

  describe('duplicateComponent', () => {
    it('creates a copy after the original', () => {
      useEditorStore.getState().addComponent('text');
      const originalId = useEditorStore.getState().document.components[0].id;
      useEditorStore.getState().duplicateComponent(originalId);
      const components = useEditorStore.getState().document.components;
      expect(components).toHaveLength(2);
      expect(components[1].id).not.toBe(originalId);
      expect(components[1].typeData.type).toBe('text');
    });

    it('appends " Copy" to the name', () => {
      useEditorStore.getState().addComponent('text');
      const originalId = useEditorStore.getState().document.components[0].id;
      useEditorStore.getState().duplicateComponent(originalId);
      const copy = useEditorStore.getState().document.components[1];
      expect(copy.name).toContain('Copy');
    });

    it('offsets the duplicate by 20 dots', () => {
      useEditorStore.getState().addComponent('text', { left: 10, top: 20 });
      const originalId = useEditorStore.getState().document.components[0].id;
      useEditorStore.getState().duplicateComponent(originalId);
      const copy = useEditorStore.getState().document.components[1];
      expect(copy.constraints.left).toBe(30); // 10 + 20
      expect(copy.constraints.top).toBe(40); // 20 + 20
    });

    it('selects the duplicate', () => {
      useEditorStore.getState().addComponent('text');
      const originalId = useEditorStore.getState().document.components[0].id;
      useEditorStore.getState().duplicateComponent(originalId);
      const copy = useEditorStore.getState().document.components[1];
      expect(useEditorStore.getState().selectedComponentIds).toEqual([copy.id]);
    });
  });

  describe('updateConstraints', () => {
    it('merges constraints onto a component', () => {
      const id = useEditorStore.getState().addComponent('text', { left: 10 });
      useEditorStore.getState().updateConstraints(id, { top: 50, width: 200 });
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.constraints.left).toBe(10);
      expect(comp.constraints.top).toBe(50);
      expect(comp.constraints.width).toBe(200);
    });
  });

  describe('updateProperties', () => {
    it('merges properties onto a component', () => {
      const id = useEditorStore.getState().addComponent('text');
      useEditorStore.getState().updateProperties(id, { content: 'Updated' });
      const comp = useEditorStore.getState().document.components[0];
      expect((comp.typeData.props as { content: string }).content).toBe('Updated');
    });
  });

  describe('renameComponent', () => {
    it('changes component name', () => {
      const id = useEditorStore.getState().addComponent('text');
      useEditorStore.getState().renameComponent(id, 'My Label');
      expect(useEditorStore.getState().document.components[0].name).toBe('My Label');
    });
  });

  describe('togglePin', () => {
    it('adds a pin and sets the constraint value', () => {
      const id = useEditorStore.getState().addComponent('text', { left: 10, top: 20, width: 100, height: 30 });
      useEditorStore.getState().togglePin(id, 'right');
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.pins).toContain('right');
      // right = labelWidth - left - width = 406 - 10 - 100 = 296
      expect(comp.constraints.right).toBe(296);
    });

    it('removes a pin on second toggle', () => {
      const id = useEditorStore.getState().addComponent('text', { left: 10, top: 20, width: 100, height: 30 });
      useEditorStore.getState().togglePin(id, 'right');
      useEditorStore.getState().togglePin(id, 'right');
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.pins).not.toContain('right');
      // right constraint is removed when unpinning right/bottom
      expect(comp.constraints.right).toBeUndefined();
    });

    it('does not remove constraint when unpinning left', () => {
      const id = useEditorStore.getState().addComponent('text', { left: 10, top: 20 });
      // Pin left, then unpin
      useEditorStore.getState().togglePin(id, 'left');
      useEditorStore.getState().togglePin(id, 'left');
      const comp = useEditorStore.getState().document.components[0];
      // left constraint should still exist since only right/bottom get deleted
      expect(comp.constraints.left).toBe(10);
    });
  });

  describe('reorderComponents', () => {
    it('moves a component to a new position', () => {
      useEditorStore.getState().addComponent('text');
      useEditorStore.getState().addComponent('rectangle');
      useEditorStore.getState().addComponent('barcode');
      const names = () => useEditorStore.getState().document.components.map(c => c.typeData.type);
      expect(names()).toEqual(['text', 'rectangle', 'barcode']);
      useEditorStore.getState().reorderComponents(0, 2);
      expect(names()).toEqual(['rectangle', 'barcode', 'text']);
    });

    it('does nothing for out-of-bounds indices', () => {
      useEditorStore.getState().addComponent('text');
      useEditorStore.getState().reorderComponents(-1, 5);
      expect(useEditorStore.getState().document.components).toHaveLength(1);
    });

    it('does nothing when fromIndex equals toIndex', () => {
      useEditorStore.getState().addComponent('text');
      useEditorStore.getState().addComponent('rectangle');
      const before = useEditorStore.getState().document.components.map(c => c.id);
      useEditorStore.getState().reorderComponents(0, 0);
      const after = useEditorStore.getState().document.components.map(c => c.id);
      expect(after).toEqual(before);
    });
  });

  describe('reparentComponent', () => {
    it('moves a component into a container', () => {
      const textId = useEditorStore.getState().addComponent('text');
      const containerId = useEditorStore.getState().addComponent('container');
      useEditorStore.getState().reparentComponent(textId, containerId);
      const state = useEditorStore.getState();
      expect(state.document.components).toHaveLength(1); // only container at root
      expect(state.document.components[0].children).toHaveLength(1);
      expect(state.document.components[0].children![0].id).toBe(textId);
    });

    it('moves a component to root', () => {
      const containerId = useEditorStore.getState().addComponent('container');
      const childId = useEditorStore.getState().addComponentToContainer(containerId, 'text');
      useEditorStore.getState().reparentComponent(childId, null);
      const state = useEditorStore.getState();
      expect(state.document.components).toHaveLength(2);
      expect(state.document.components[0].children).toHaveLength(0);
    });

    it('falls back to root if target is not a container', () => {
      const textId = useEditorStore.getState().addComponent('text');
      const rectId = useEditorStore.getState().addComponent('rectangle');
      useEditorStore.getState().reparentComponent(textId, rectId);
      // Rectangle has no children array, so text goes to root
      const state = useEditorStore.getState();
      const rootIds = state.document.components.map(c => c.id);
      expect(rootIds).toContain(textId);
    });
  });

  describe('selectComponent', () => {
    it('sets selected component', () => {
      const id = useEditorStore.getState().addComponent('text');
      useEditorStore.getState().selectComponent(null);
      expect(useEditorStore.getState().selectedComponentIds).toEqual([]);
      useEditorStore.getState().selectComponent(id);
      expect(useEditorStore.getState().selectedComponentIds).toEqual([id]);
    });

    it('toggle adds to selection', () => {
      const id1 = useEditorStore.getState().addComponent('text');
      const id2 = useEditorStore.getState().addComponent('rectangle');
      useEditorStore.getState().selectComponent(id1);
      useEditorStore.getState().selectComponent(id2, { toggle: true });
      expect(useEditorStore.getState().selectedComponentIds).toEqual([id1, id2]);
    });

    it('toggle removes from selection', () => {
      const id1 = useEditorStore.getState().addComponent('text');
      const id2 = useEditorStore.getState().addComponent('rectangle');
      useEditorStore.getState().selectComponent(id1);
      useEditorStore.getState().selectComponent(id2, { toggle: true });
      useEditorStore.getState().selectComponent(id1, { toggle: true });
      expect(useEditorStore.getState().selectedComponentIds).toEqual([id2]);
    });
  });

  describe('selectAll', () => {
    it('selects all components including children', () => {
      const textId = useEditorStore.getState().addComponent('text');
      const containerId = useEditorStore.getState().addComponent('container');
      const childId = useEditorStore.getState().addComponentToContainer(containerId, 'rectangle');
      useEditorStore.getState().selectAll();
      const ids = useEditorStore.getState().selectedComponentIds;
      expect(ids).toContain(textId);
      expect(ids).toContain(containerId);
      expect(ids).toContain(childId);
      expect(ids).toHaveLength(3);
    });
  });

  describe('viewport', () => {
    it('setZoom updates zoom', () => {
      useEditorStore.getState().setZoom(2.5);
      expect(useEditorStore.getState().viewport.zoom).toBe(2.5);
    });

    it('setPan updates pan', () => {
      useEditorStore.getState().setPan(100, 200);
      expect(useEditorStore.getState().viewport.panX).toBe(100);
      expect(useEditorStore.getState().viewport.panY).toBe(200);
    });

    it('setViewport updates all at once', () => {
      useEditorStore.getState().setViewport(3, 50, 75);
      const v = useEditorStore.getState().viewport;
      expect(v).toEqual({ zoom: 3, panX: 50, panY: 75 });
    });
  });

  describe('interaction state', () => {
    it('setInteractionMode changes mode', () => {
      useEditorStore.getState().setInteractionMode('pan');
      expect(useEditorStore.getState().interactionMode).toBe('pan');
    });

    it('setDragState sets drag state', () => {
      const ds = { componentId: 'x', startX: 0, startY: 0, startConstraints: {} };
      useEditorStore.getState().setDragState(ds);
      expect(useEditorStore.getState().dragState).toEqual(ds);
    });

    it('setResizeState sets resize state', () => {
      const rs = { componentId: 'x', handle: 'top-left' as const, startX: 0, startY: 0, startConstraints: {} };
      useEditorStore.getState().setResizeState(rs);
      expect(useEditorStore.getState().resizeState).toEqual(rs);
    });

    it('setPaletteDropState sets palette drop state', () => {
      const pds = { type: 'text' as const, ghostX: 10, ghostY: 20 };
      useEditorStore.getState().setPaletteDropState(pds);
      expect(useEditorStore.getState().paletteDropState).toEqual(pds);
    });
  });

  describe('updateLabelConfig', () => {
    it('merges label config', () => {
      useEditorStore.getState().updateLabelConfig({ dpi: 300 });
      expect(useEditorStore.getState().document.label.dpi).toBe(300);
      expect(useEditorStore.getState().document.label.widthInches).toBe(2); // unchanged
    });
  });

  describe('toggleGrid', () => {
    it('toggles showGrid', () => {
      expect(useEditorStore.getState().showGrid).toBe(true);
      useEditorStore.getState().toggleGrid();
      expect(useEditorStore.getState().showGrid).toBe(false);
      useEditorStore.getState().toggleGrid();
      expect(useEditorStore.getState().showGrid).toBe(true);
    });
  });

  describe('loadDocument', () => {
    it('replaces the document and clears selection', () => {
      useEditorStore.getState().addComponent('text');
      const newDoc: LabelDocument = {
        version: 1,
        label: { widthInches: 4, heightInches: 6, dpi: 300 },
        components: [],
      };
      useEditorStore.getState().loadDocument(newDoc);
      expect(useEditorStore.getState().document).toEqual(newDoc);
      expect(useEditorStore.getState().selectedComponentIds).toEqual([]);
    });

    it('undo after load does not change state', () => {
      vi.useFakeTimers();
      useEditorStore.getState().addComponent('text');
      useEditorStore.getState().addComponent('rectangle');
      const newDoc: LabelDocument = {
        version: 1,
        label: { widthInches: 4, heightInches: 6, dpi: 300 },
        components: [],
      };
      useEditorStore.getState().loadDocument(newDoc);
      // Advance past the throttle window so any trailing call would fire
      vi.advanceTimersByTime(1000);
      const docAfterLoad = useEditorStore.getState().document;
      useEditorStore.temporal.getState().undo();
      expect(useEditorStore.getState().document).toEqual(docAfterLoad);
      vi.useRealTimers();
    });

    it('undo after load does not restore a stale drag snapshot', () => {
      vi.useFakeTimers();
      const id = useEditorStore.getState().addComponent('text', { left: 10, top: 20 });
      // Simulate entering a drag (captures snapshot)
      useEditorStore.getState().setDragState({
        componentId: id, startX: 0, startY: 0, startConstraints: { left: 10, top: 20 },
      });
      // Load a new document while drag snapshot exists
      const newDoc: LabelDocument = {
        version: 1,
        label: { widthInches: 4, heightInches: 6, dpi: 300 },
        components: [],
      };
      useEditorStore.getState().loadDocument(newDoc);
      vi.advanceTimersByTime(1000);
      const docAfterLoad = useEditorStore.getState().document;
      useEditorStore.temporal.getState().undo();
      expect(useEditorStore.getState().document).toEqual(docAfterLoad);
      vi.useRealTimers();
    });
  });

  describe('resetDocument', () => {
    it('resets to initial state', () => {
      useEditorStore.getState().addComponent('text');
      useEditorStore.getState().setZoom(3);
      useEditorStore.getState().resetDocument();
      expect(useEditorStore.getState().document.components).toHaveLength(0);
      expect(useEditorStore.getState().viewport.zoom).toBe(1);
      expect(useEditorStore.getState().selectedComponentIds).toEqual([]);
    });

    it('clears label meta', () => {
      useEditorStore.getState().setLabelMeta('label-123', 'My Label');
      useEditorStore.getState().resetDocument();
      expect(useEditorStore.getState().currentLabelId).toBeNull();
      expect(useEditorStore.getState().currentLabelName).toBeNull();
    });

    it('undo after reset does not change state', () => {
      vi.useFakeTimers();
      useEditorStore.getState().addComponent('text');
      useEditorStore.getState().addComponent('rectangle');
      useEditorStore.getState().resetDocument();
      vi.advanceTimersByTime(1000);
      const docAfterReset = useEditorStore.getState().document;
      useEditorStore.temporal.getState().undo();
      expect(useEditorStore.getState().document).toEqual(docAfterReset);
      vi.useRealTimers();
    });
  });

  describe('setLabelMeta', () => {
    it('sets currentLabelId and currentLabelName', () => {
      useEditorStore.getState().setLabelMeta('id-1', 'Test Label');
      expect(useEditorStore.getState().currentLabelId).toBe('id-1');
      expect(useEditorStore.getState().currentLabelName).toBe('Test Label');
    });

    it('can clear label meta by passing null', () => {
      useEditorStore.getState().setLabelMeta('id-1', 'Test Label');
      useEditorStore.getState().setLabelMeta(null, null);
      expect(useEditorStore.getState().currentLabelId).toBeNull();
      expect(useEditorStore.getState().currentLabelName).toBeNull();
    });

    it('does not affect document or selection', () => {
      const id = useEditorStore.getState().addComponent('text');
      useEditorStore.getState().setLabelMeta('label-1', 'Label');
      expect(useEditorStore.getState().document.components).toHaveLength(1);
      expect(useEditorStore.getState().selectedComponentIds).toContain(id);
    });

    it('is excluded from undo history (partialize only tracks document)', () => {
      useEditorStore.getState().setLabelMeta('id-1', 'Label A');
      useEditorStore.getState().setLabelMeta('id-2', 'Label B');
      // Undo should not affect label meta since partialize only tracks document
      useEditorStore.temporal.getState().undo();
      // Label meta should remain unchanged
      expect(useEditorStore.getState().currentLabelId).toBe('id-2');
      expect(useEditorStore.getState().currentLabelName).toBe('Label B');
    });
  });
});
