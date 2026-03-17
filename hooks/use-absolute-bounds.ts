import { useState, useCallback, useMemo } from 'react';
import { useDocument } from '@/lib/store/editor-context';
import { resolveDocument } from '@/lib/constraints/resolver';
import type { LabelComponent, ResolvedBounds } from '@/lib/types';
import { getSizingMode } from '@/lib/components';

export function useAbsoluteBounds() {
  const document = useDocument();

  const [measuredSizes, setMeasuredSizes] = useState<Map<string, { width: number; height: number }>>(new Map());

  const handleMeasure = useCallback((id: string, width: number, height: number) => {
    setMeasuredSizes((prev) => {
      const existing = prev.get(id);
      if (existing && existing.width === width && existing.height === height) return prev;
      const next = new Map(prev);
      next.set(id, { width, height });
      return next;
    });
  }, []);

  const boundsMap = useMemo(() => resolveDocument(document), [document]);

  const absoluteBoundsMap = useMemo(() => {
    function walk(
      components: LabelComponent[],
      bMap: Map<string, ResolvedBounds>,
      measured: Map<string, { width: number; height: number }>,
      offsetX: number,
      offsetY: number,
      result: Map<string, ResolvedBounds>
    ) {
      for (const comp of components) {
        const b = bMap.get(comp.id);
        if (!b) continue;
        let w = b.width;
        let h = b.height;
        const sizing = getSizingMode(comp);
        if (sizing === 'width-only') {
          const m = measured.get(comp.id);
          if (m) h = m.height;
        } else if (sizing === 'auto') {
          const m = measured.get(comp.id);
          if (m) { w = m.width; h = m.height; }
        }
        const abs = { x: b.x + offsetX, y: b.y + offsetY, width: w, height: h };
        result.set(comp.id, abs);
        if (comp.children) {
          walk(comp.children, bMap, measured, abs.x, abs.y, result);
        }
      }
    }
    const result = new Map<string, ResolvedBounds>();
    walk(document.components, boundsMap, measuredSizes, 0, 0, result);
    return result;
  }, [document, boundsMap, measuredSizes]);

  return { boundsMap, absoluteBoundsMap, handleMeasure };
}
