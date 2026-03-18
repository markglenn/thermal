import { useState, useCallback, useMemo } from 'react';
import { useDocument, useEditorStoreApi } from '@/lib/store/editor-context';
import { resolveDocument } from '@/lib/constraints/resolver';
import { getDefinition } from '@/lib/components';
import { findComponent } from '@/lib/utils';
import type { LabelComponent, ResolvedBounds } from '@/lib/types';

export function useAbsoluteBounds() {
  const document = useDocument();
  const storeApi = useEditorStoreApi();

  // DOM-measured sizes for components without computeContentSize (e.g. text)
  const [measuredSizes, setMeasuredSizes] = useState<Map<string, { width: number; height: number }>>(new Map());

  const handleMeasure = useCallback((id: string, width: number, height: number) => {
    const w = Math.round(width);
    const h = Math.round(height);

    setMeasuredSizes((prev) => {
      const existing = prev.get(id);
      if (existing && existing.width === w && existing.height === h) return prev;
      const next = new Map(prev);
      next.set(id, { width: w, height: h });
      return next;
    });

    // Write measured size into constraints so the resolver has correct
    // dimensions for pin calculations. Pause tracking to avoid undo entries.
    const state = storeApi.getState();
    const comp = findComponent(state.document.components, id);
    if (comp && (comp.constraints.width !== w || comp.constraints.height !== h)) {
      storeApi.temporal.getState().pause();
      state.updateConstraints(id, { width: w, height: h });
      storeApi.temporal.getState().resume();
    }
  }, [storeApi]);

  const boundsMap = useMemo(() => resolveDocument(document), [document]);

  const absoluteBoundsMap = useMemo(() => {
    const result = new Map<string, ResolvedBounds>();
    function walk(comps: LabelComponent[], offsetX: number, offsetY: number) {
      for (const comp of comps) {
        const b = boundsMap.get(comp.id);
        if (!b) continue;

        let w = b.width;
        let h = b.height;

        const def = getDefinition(comp.typeData.type);
        if (!def.computeContentSize) {
          const m = measuredSizes.get(comp.id);
          if (m) { w = m.width; h = m.height; }
        }

        result.set(comp.id, { x: b.x + offsetX, y: b.y + offsetY, width: w, height: h });
        if (comp.children) {
          walk(comp.children, b.x + offsetX, b.y + offsetY);
        }
      }
    }
    walk(document.components, 0, 0);
    return result;
  }, [document, boundsMap, measuredSizes]);

  return { boundsMap, absoluteBoundsMap, handleMeasure };
}
