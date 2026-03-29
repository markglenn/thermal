import { useState, useCallback, useMemo } from 'react';
import { useDocument, useEditorStoreApi, useActiveVariant } from '@/lib/store/editor-context';
import { resolveDocument } from '@/lib/constraints/resolver';
import { getDefinition, getSizingMode } from '@/lib/components';
import { findComponent } from '@/lib/utils';
import type { LabelComponent, ResolvedBounds } from '@/lib/types';

export function useAbsoluteBounds() {
  const document = useDocument();
  const activeVariant = useActiveVariant();
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

    // Write measured size into layout only for DOM-measured components
    // (those without computeContentSize, like text) so the resolver has correct
    // dimensions for anchor calculations. Pause tracking to avoid undo entries.
    const state = storeApi.getState();
    const comp = findComponent(state.document.components, id);
    if (comp) {
      const def = getDefinition(comp.typeData.type);
      const sizing = getSizingMode(comp);
      // Only write back for components that need DOM measurement AND don't have
      // explicit size in layout already (auto or width-only sizing)
      if (!def.computeContentSize && (sizing === 'auto' || sizing === 'width-only')) {
        const writeW = sizing === 'auto' && comp.layout.width !== w;
        // Don't overwrite height for field block text with maxLines — height is user-controlled
        const hasMaxLines = comp.typeData.type === 'text'
          && (comp.typeData.props as { fieldBlock?: { maxLines: number } }).fieldBlock?.maxLines
          && (comp.typeData.props as { fieldBlock?: { maxLines: number } }).fieldBlock!.maxLines > 0;
        const writeH = !hasMaxLines && comp.layout.height !== h;
        if (writeW || writeH) {
          storeApi.temporal.getState().pause();
          const update: Record<string, number> = {};
          if (writeW) update.width = w;
          if (writeH) update.height = h;
          state.updateLayout(id, update);
          storeApi.temporal.getState().resume();
        }
      }
    }
  }, [storeApi]);

  const boundsMap = useMemo(() => resolveDocument(document, activeVariant), [document, activeVariant]);

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
          if (m) {
            const sizing = getSizingMode(comp);
            // width-only: keep layout width, only use measured height
            if (sizing !== 'width-only') w = m.width;
            h = m.height;
          }
        }

        result.set(comp.id, { x: b.x + offsetX, y: b.y + offsetY, width: w, height: h });
      }
    }
    walk(document.components, 0, 0);
    return result;
  }, [document, boundsMap, measuredSizes]);

  return { boundsMap, absoluteBoundsMap, handleMeasure };
}
