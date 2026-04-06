import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEditorStore, type EditorStoreApi } from './editor-store';
import type { LabelDocument, ComponentLayout } from '../types';

// Register all components so createComponent can look them up
import '../components';

let useEditorStore: EditorStoreApi;

function defaultLayout(overrides: Partial<ComponentLayout> = {}): ComponentLayout {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 40,
    horizontalAnchor: 'left',
    verticalAnchor: 'top',
    ...overrides,
  };
}

describe('editor store', () => {
  beforeEach(() => {
    useEditorStore = createEditorStore();
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

    it('applies layout overrides', () => {
      useEditorStore.getState().addComponent('text', { x: 99, y: 77 });
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.layout.x).toBe(99);
      expect(comp.layout.y).toBe(77);
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
      useEditorStore.getState().addComponent('text', { x: 10, y: 20 });
      const originalId = useEditorStore.getState().document.components[0].id;
      useEditorStore.getState().duplicateComponent(originalId);
      const copy = useEditorStore.getState().document.components[1];
      expect(copy.layout.x).toBe(30); // 10 + 20
      expect(copy.layout.y).toBe(40); // 20 + 20
    });

    it('selects the duplicate', () => {
      useEditorStore.getState().addComponent('text');
      const originalId = useEditorStore.getState().document.components[0].id;
      useEditorStore.getState().duplicateComponent(originalId);
      const copy = useEditorStore.getState().document.components[1];
      expect(useEditorStore.getState().selectedComponentIds).toEqual([copy.id]);
    });
  });

  describe('updateLayout', () => {
    it('merges layout onto a fixed-size component', () => {
      const id = useEditorStore.getState().addComponent('rectangle', { x: 10 });
      useEditorStore.getState().updateLayout(id, { y: 50, width: 200 });
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.layout.x).toBe(10);
      expect(comp.layout.y).toBe(50);
      expect(comp.layout.width).toBe(200);
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

  describe('pasteComponents', () => {
    it('adds cloned components with new IDs and offset', () => {
      const id = useEditorStore.getState().addComponent('text', { x: 10, y: 20 });
      const comp = useEditorStore.getState().document.components[0];
      const pastedIds = useEditorStore.getState().pasteComponents([comp]);
      const state = useEditorStore.getState();
      expect(state.document.components).toHaveLength(2);
      expect(pastedIds).toHaveLength(1);
      expect(pastedIds[0]).not.toBe(id);
      const pasted = state.document.components[1];
      expect(pasted.layout.x).toBe(30); // 10 + 20
      expect(pasted.layout.y).toBe(40); // 20 + 20
    });

    it('selects all pasted components', () => {
      useEditorStore.getState().addComponent('text');
      useEditorStore.getState().addComponent('rectangle');
      const comps = useEditorStore.getState().document.components;
      const pastedIds = useEditorStore.getState().pasteComponents(comps);
      expect(useEditorStore.getState().selectedComponentIds).toEqual(pastedIds);
    });

    it('does not mutate the source components', () => {
      useEditorStore.getState().addComponent('text');
      const comp = useEditorStore.getState().document.components[0];
      const snapshot = structuredClone(comp);
      useEditorStore.getState().pasteComponents([comp]);
      expect(comp.id).toBe(snapshot.id);
      expect(comp.layout.x).toBe(snapshot.layout.x);
    });
  });

  describe('setAnchor', () => {
    it('changes horizontal anchor and recomputes x to keep same visual position', () => {
      // Default label is 2" x 1" @ 203 DPI = 406 x 203 dots
      const id = useEditorStore.getState().addComponent('rectangle', { x: 10, y: 20, width: 100, height: 30 });
      useEditorStore.getState().setAnchor(id, 'right');
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.layout.horizontalAnchor).toBe('right');
      // x recomputed: 406 - 10 - 100 = 296
      expect(comp.layout.x).toBe(296);
    });

    it('changes vertical anchor and recomputes y to keep same visual position', () => {
      const id = useEditorStore.getState().addComponent('rectangle', { x: 10, y: 20, width: 100, height: 30 });
      useEditorStore.getState().setAnchor(id, undefined, 'bottom');
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.layout.verticalAnchor).toBe('bottom');
      // y recomputed: 203 - 20 - 30 = 153
      expect(comp.layout.y).toBe(153);
    });

    it('changing anchor back to left restores original x', () => {
      const id = useEditorStore.getState().addComponent('rectangle', { x: 10, y: 20, width: 100, height: 30 });
      useEditorStore.getState().setAnchor(id, 'right');
      useEditorStore.getState().setAnchor(id, 'left');
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.layout.horizontalAnchor).toBe('left');
      expect(comp.layout.x).toBe(10);
    });

    it('does nothing if anchor is already the same', () => {
      const id = useEditorStore.getState().addComponent('rectangle', { x: 10, y: 20, width: 100, height: 30 });
      useEditorStore.getState().setAnchor(id, 'left');
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.layout.x).toBe(10); // unchanged
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
    it('selects all components', () => {
      const textId = useEditorStore.getState().addComponent('text');
      const rectId = useEditorStore.getState().addComponent('rectangle');
      useEditorStore.getState().selectAll();
      const ids = useEditorStore.getState().selectedComponentIds;
      expect(ids).toContain(textId);
      expect(ids).toContain(rectId);
      expect(ids).toHaveLength(2);
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
      const ds = {
        componentId: 'x',
        startX: 0,
        startY: 0,
        startLayout: defaultLayout(),
      };
      useEditorStore.getState().setDragState(ds);
      expect(useEditorStore.getState().dragState).toEqual(ds);
    });

    it('setResizeState sets resize state', () => {
      const rs = {
        componentId: 'x',
        handle: 'top-left' as const,
        startX: 0,
        startY: 0,
        startLayout: defaultLayout(),
      };
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
      // variants should be unchanged
      expect(useEditorStore.getState().document.label.variants[0].widthDots).toBe(406);
    });
  });

  describe('variant actions', () => {
    it('setActiveVariant switches the active variant', () => {
      useEditorStore.getState().updateLabelConfig({
        variants: [
          { name: 'US', widthDots: 812, heightDots: 1218, unit: 'in' },
          { name: 'UK', widthDots: 800, heightDots: 1197, unit: 'mm' },
        ],
      });
      useEditorStore.getState().setActiveVariant('UK');
      expect(useEditorStore.getState().activeVariant).toBe('UK');
    });

    it('addVariant adds a new variant', () => {
      useEditorStore.getState().addVariant({ name: 'UK', widthDots: 800, heightDots: 1197, unit: 'mm' });
      expect(useEditorStore.getState().document.label.variants).toHaveLength(2);
    });

    it('updateVariant updates an existing variant', () => {
      useEditorStore.getState().updateVariant('Default', { widthDots: 999 });
      expect(useEditorStore.getState().document.label.variants[0].widthDots).toBe(999);
    });

    it('removeVariant removes a variant and switches active if needed', () => {
      useEditorStore.getState().addVariant({ name: 'UK', widthDots: 800, heightDots: 1197, unit: 'mm' });
      useEditorStore.getState().setActiveVariant('Default');
      useEditorStore.getState().removeVariant('Default');
      expect(useEditorStore.getState().document.label.variants).toHaveLength(1);
      expect(useEditorStore.getState().activeVariant).toBe('UK');
    });

    it('removeVariant does not remove the last variant', () => {
      useEditorStore.getState().removeVariant('Default');
      expect(useEditorStore.getState().document.label.variants).toHaveLength(1);
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
        label: { dpi: 300, variants: [{ name: 'Default', widthDots: 1200, heightDots: 1800, unit: 'in' }] },
        components: [],
      };
      useEditorStore.getState().loadDocument(newDoc);
      expect(useEditorStore.getState().document).toEqual(newDoc);
      expect(useEditorStore.getState().selectedComponentIds).toEqual([]);
    });

    it('migrates legacy label config on load', () => {
      // Simulate a legacy document with widthInches/heightInches
      const legacyDoc = {
        version: 1 as const,
        label: { widthInches: 4, heightInches: 6, dpi: 203 as const },
        components: [],
      };
      useEditorStore.getState().loadDocument(legacyDoc as unknown as LabelDocument);
      const label = useEditorStore.getState().document.label;
      expect(label.variants).toHaveLength(1);
      expect(label.variants[0].widthDots).toBe(812);
      expect(label.variants[0].heightDots).toBe(1218);
      expect(useEditorStore.getState().activeVariant).toBe('Default');
    });

    it('undo after load does not change state', () => {
      vi.useFakeTimers();
      useEditorStore.getState().addComponent('text');
      useEditorStore.getState().addComponent('rectangle');
      const newDoc: LabelDocument = {
        version: 1,
        label: { dpi: 300, variants: [{ name: 'Default', widthDots: 1200, heightDots: 1800, unit: 'in' }] },
        components: [],
      };
      useEditorStore.getState().loadDocument(newDoc);
      vi.advanceTimersByTime(1000);
      const docAfterLoad = useEditorStore.getState().document;
      useEditorStore.temporal.getState().undo();
      expect(useEditorStore.getState().document).toEqual(docAfterLoad);
      vi.useRealTimers();
    });

    it('undo after load does not restore a stale drag snapshot', () => {
      vi.useFakeTimers();
      const id = useEditorStore.getState().addComponent('text', { x: 10, y: 20 });
      useEditorStore.getState().setDragState({
        componentId: id,
        startX: 0,
        startY: 0,
        startLayout: defaultLayout({ x: 10, y: 20 }),
      });
      const newDoc: LabelDocument = {
        version: 1,
        label: { dpi: 300, variants: [{ name: 'Default', widthDots: 1200, heightDots: 1800, unit: 'in' }] },
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

  // =========================================================================
  // Characterization tests — capture current behavior before refactoring
  // =========================================================================

  describe('updateMultipleLayouts', () => {
    it('updates multiple components in a single set call', () => {
      const id1 = useEditorStore.getState().addComponent('rectangle', { x: 0, y: 0 });
      const id2 = useEditorStore.getState().addComponent('rectangle', { x: 50, y: 50 });
      useEditorStore.getState().updateMultipleLayouts([
        { id: id1, layout: { x: 100 } },
        { id: id2, layout: { x: 200 } },
      ]);
      expect(useEditorStore.getState().document.components[0].layout.x).toBe(100);
      expect(useEditorStore.getState().document.components[1].layout.x).toBe(200);
    });

    it('skips non-existent component IDs', () => {
      const id = useEditorStore.getState().addComponent('rectangle');
      useEditorStore.getState().updateMultipleLayouts([
        { id, layout: { x: 77 } },
        { id: 'nonexistent', layout: { x: 999 } },
      ]);
      expect(useEditorStore.getState().document.components[0].layout.x).toBe(77);
    });
  });

  describe('updateFieldBinding', () => {
    it('sets a field binding', () => {
      const id = useEditorStore.getState().addComponent('text');
      useEditorStore.getState().updateFieldBinding(id, 'sku');
      expect(useEditorStore.getState().document.components[0].fieldBinding).toBe('sku');
    });

    it('clears a field binding with undefined', () => {
      const id = useEditorStore.getState().addComponent('text');
      useEditorStore.getState().updateFieldBinding(id, 'sku');
      useEditorStore.getState().updateFieldBinding(id, undefined);
      expect(useEditorStore.getState().document.components[0].fieldBinding).toBeUndefined();
    });

    it('clears a field binding with empty string', () => {
      const id = useEditorStore.getState().addComponent('text');
      useEditorStore.getState().updateFieldBinding(id, 'sku');
      useEditorStore.getState().updateFieldBinding(id, '');
      // Empty string is falsy, so binding should be deleted
      expect(useEditorStore.getState().document.components[0].fieldBinding).toBeUndefined();
    });
  });

  describe('updateVisibilityCondition', () => {
    it('sets a visibility condition', () => {
      const id = useEditorStore.getState().addComponent('text');
      const condition = { field: 'sku', operator: '==' as const, value: 'ABC' };
      useEditorStore.getState().updateVisibilityCondition(id, condition);
      expect(useEditorStore.getState().document.components[0].visibilityCondition).toEqual(condition);
    });

    it('clears a visibility condition', () => {
      const id = useEditorStore.getState().addComponent('text');
      useEditorStore.getState().updateVisibilityCondition(id, { field: 'x', operator: 'isEmpty' });
      useEditorStore.getState().updateVisibilityCondition(id, undefined);
      expect(useEditorStore.getState().document.components[0].visibilityCondition).toBeUndefined();
    });
  });

  describe('toggleLock', () => {
    it('toggles lockX on a component', () => {
      const id = useEditorStore.getState().addComponent('text');
      expect(useEditorStore.getState().document.components[0].layout.lockX).toBeFalsy();
      useEditorStore.getState().toggleLock(id, 'x');
      expect(useEditorStore.getState().document.components[0].layout.lockX).toBe(true);
      useEditorStore.getState().toggleLock(id, 'x');
      expect(useEditorStore.getState().document.components[0].layout.lockX).toBe(false);
    });

    it('toggles lockY independently of lockX', () => {
      const id = useEditorStore.getState().addComponent('text');
      useEditorStore.getState().toggleLock(id, 'x');
      useEditorStore.getState().toggleLock(id, 'y');
      const layout = useEditorStore.getState().document.components[0].layout;
      expect(layout.lockX).toBe(true);
      expect(layout.lockY).toBe(true);
    });
  });

  describe('toggleRulers', () => {
    it('toggles showRulers', () => {
      expect(useEditorStore.getState().showRulers).toBe(true);
      useEditorStore.getState().toggleRulers();
      expect(useEditorStore.getState().showRulers).toBe(false);
      useEditorStore.getState().toggleRulers();
      expect(useEditorStore.getState().showRulers).toBe(true);
    });
  });

  describe('setReadOnly', () => {
    it('sets readOnly flag', () => {
      expect(useEditorStore.getState().readOnly).toBe(false);
      useEditorStore.getState().setReadOnly(true);
      expect(useEditorStore.getState().readOnly).toBe(true);
      useEditorStore.getState().setReadOnly(false);
      expect(useEditorStore.getState().readOnly).toBe(false);
    });
  });

  describe('variables', () => {
    it('addVariable initializes array if missing and adds', () => {
      expect(useEditorStore.getState().document.variables).toBeUndefined();
      useEditorStore.getState().addVariable({ name: 'sku', type: 'text', defaultValue: '' });
      expect(useEditorStore.getState().document.variables).toHaveLength(1);
      expect(useEditorStore.getState().document.variables![0].name).toBe('sku');
    });

    it('addVariable appends to existing array', () => {
      useEditorStore.getState().addVariable({ name: 'sku', type: 'text', defaultValue: '' });
      useEditorStore.getState().addVariable({ name: 'qty', type: 'text', defaultValue: '1' });
      expect(useEditorStore.getState().document.variables).toHaveLength(2);
    });

    it('updateVariable merges updates onto existing variable', () => {
      useEditorStore.getState().addVariable({ name: 'sku', type: 'text', defaultValue: '' });
      useEditorStore.getState().updateVariable('sku', { defaultValue: 'ABC' });
      expect(useEditorStore.getState().document.variables![0].defaultValue).toBe('ABC');
    });

    it('updateVariable is a no-op for non-existent variable', () => {
      useEditorStore.getState().addVariable({ name: 'sku', type: 'text', defaultValue: '' });
      useEditorStore.getState().updateVariable('nonexistent', { defaultValue: 'X' });
      expect(useEditorStore.getState().document.variables![0].defaultValue).toBe('');
    });

    it('removeVariable removes by name', () => {
      useEditorStore.getState().addVariable({ name: 'sku', type: 'text', defaultValue: '' });
      useEditorStore.getState().addVariable({ name: 'qty', type: 'text', defaultValue: '' });
      useEditorStore.getState().removeVariable('sku');
      expect(useEditorStore.getState().document.variables).toHaveLength(1);
      expect(useEditorStore.getState().document.variables![0].name).toBe('qty');
    });

    it('removeVariable is a no-op if variables undefined', () => {
      useEditorStore.getState().removeVariable('sku');
      expect(useEditorStore.getState().document.variables).toBeUndefined();
    });
  });

  describe('renameVariant', () => {
    it('renames and updates activeVariant if renaming active', () => {
      useEditorStore.getState().renameVariant('Default', 'Primary');
      expect(useEditorStore.getState().document.label.variants[0].name).toBe('Primary');
      expect(useEditorStore.getState().activeVariant).toBe('Primary');
    });

    it('does not rename to empty string', () => {
      useEditorStore.getState().renameVariant('Default', '');
      expect(useEditorStore.getState().document.label.variants[0].name).toBe('Default');
    });

    it('does not rename to whitespace-only string', () => {
      useEditorStore.getState().renameVariant('Default', '   ');
      expect(useEditorStore.getState().document.label.variants[0].name).toBe('Default');
    });

    it('does not rename to a duplicate name', () => {
      useEditorStore.getState().addVariant({ name: 'UK', widthDots: 800, heightDots: 1197, unit: 'mm' });
      useEditorStore.getState().renameVariant('Default', 'UK');
      expect(useEditorStore.getState().document.label.variants[0].name).toBe('Default');
    });

    it('allows renaming to same name (no-op)', () => {
      useEditorStore.getState().renameVariant('Default', 'Default');
      expect(useEditorStore.getState().document.label.variants[0].name).toBe('Default');
    });
  });

  describe('setActiveVariant', () => {
    it('does not switch to non-existent variant', () => {
      useEditorStore.getState().setActiveVariant('NonExistent');
      expect(useEditorStore.getState().activeVariant).toBe('Default');
    });
  });

  describe('loadDocument with legacy constraints', () => {
    it('migrates legacy constraints to layout model', () => {
      const legacyDoc = {
        version: 1 as const,
        label: { dpi: 203 as const, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' as const }] },
        components: [{
          id: 'comp-1',
          name: 'Text 1',
          constraints: { left: 10, top: 20, width: 100, height: 50 },
          pins: ['left', 'top'],
          typeData: { type: 'rectangle' as const, props: { borderThickness: 2, cornerRadius: 0, filled: false } },
        }],
      };
      useEditorStore.getState().loadDocument(legacyDoc as unknown as LabelDocument);
      const comp = useEditorStore.getState().document.components[0];
      expect(comp.layout).toBeDefined();
      expect(comp.layout.x).toBe(10);
      expect(comp.layout.y).toBe(20);
      expect(comp.layout.width).toBe(100);
      expect(comp.layout.height).toBe(50);
      expect(comp.layout.horizontalAnchor).toBe('left');
      expect(comp.layout.verticalAnchor).toBe('top');
      expect(comp.constraints).toBeUndefined();
      expect(comp.pins).toBeUndefined();
    });
  });

  describe('undo batching during drag', () => {
    it('collapses multiple layout updates during drag into one undo entry', () => {
      vi.useFakeTimers();
      const id = useEditorStore.getState().addComponent('rectangle', { x: 0, y: 0, width: 100, height: 50 });
      // Flush the addComponent to undo history
      vi.advanceTimersByTime(1000);

      const undoBefore = useEditorStore.temporal.getState().pastStates.length;

      // Start drag
      useEditorStore.getState().setDragState({
        componentId: id,
        startX: 0,
        startY: 0,
        startLayout: { ...useEditorStore.getState().document.components[0].layout },
      });

      // Multiple layout updates during drag
      useEditorStore.getState().updateLayout(id, { x: 10 });
      useEditorStore.getState().updateLayout(id, { x: 20 });
      useEditorStore.getState().updateLayout(id, { x: 30 });

      // End drag
      useEditorStore.getState().setDragState(null);
      vi.advanceTimersByTime(1000);

      const undoAfter = useEditorStore.temporal.getState().pastStates.length;
      // Should have exactly one new undo entry (the batch)
      expect(undoAfter - undoBefore).toBe(1);

      // Current position should be the final drag position
      expect(useEditorStore.getState().document.components[0].layout.x).toBe(30);

      // Undo should restore to pre-drag position
      useEditorStore.temporal.getState().undo();
      expect(useEditorStore.getState().document.components[0].layout.x).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('undo batching during resize', () => {
    it('collapses multiple layout updates during resize into one undo entry', () => {
      vi.useFakeTimers();
      const id = useEditorStore.getState().addComponent('rectangle', { x: 0, y: 0, width: 100, height: 50 });
      vi.advanceTimersByTime(1000);

      const undoBefore = useEditorStore.temporal.getState().pastStates.length;

      useEditorStore.getState().setResizeState({
        componentId: id,
        handle: 'right',
        startX: 100,
        startY: 0,
        startLayout: { ...useEditorStore.getState().document.components[0].layout },
      });

      useEditorStore.getState().updateLayout(id, { width: 150 });
      useEditorStore.getState().updateLayout(id, { width: 200 });

      useEditorStore.getState().setResizeState(null);
      vi.advanceTimersByTime(1000);

      const undoAfter = useEditorStore.temporal.getState().pastStates.length;
      expect(undoAfter - undoBefore).toBe(1);

      expect(useEditorStore.getState().document.components[0].layout.width).toBe(200);
      useEditorStore.temporal.getState().undo();
      expect(useEditorStore.getState().document.components[0].layout.width).toBe(100);

      vi.useRealTimers();
    });
  });

  describe('duplicate clears locks', () => {
    it('removes lockX and lockY from duplicated component', () => {
      const id = useEditorStore.getState().addComponent('rectangle');
      useEditorStore.getState().toggleLock(id, 'x');
      useEditorStore.getState().toggleLock(id, 'y');
      useEditorStore.getState().duplicateComponent(id);
      const copy = useEditorStore.getState().document.components[1];
      expect(copy.layout.lockX).toBeUndefined();
      expect(copy.layout.lockY).toBeUndefined();
    });
  });

  describe('duplicate offset respects right anchor', () => {
    it('offsets in negative direction for right-anchored component', () => {
      const id = useEditorStore.getState().addComponent('rectangle', { x: 50, width: 100, height: 50 });
      useEditorStore.getState().setAnchor(id, 'right');
      const xBefore = useEditorStore.getState().document.components[0].layout.x;
      useEditorStore.getState().duplicateComponent(id);
      const copy = useEditorStore.getState().document.components[1];
      // Right anchor: offset subtracts (moves visually right = toward center)
      expect(copy.layout.x).toBe(xBefore - 20);
    });
  });

  describe('center anchor', () => {
    it('sets x to 0 for center anchor', () => {
      const id = useEditorStore.getState().addComponent('rectangle', { x: 50, width: 100, height: 50 });
      useEditorStore.getState().setAnchor(id, 'center');
      expect(useEditorStore.getState().document.components[0].layout.x).toBe(0);
      expect(useEditorStore.getState().document.components[0].layout.horizontalAnchor).toBe('center');
    });
  });
});
