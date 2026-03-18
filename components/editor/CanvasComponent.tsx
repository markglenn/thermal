'use client';

import { useRef, useEffect } from 'react';
import type { LabelComponent, ResolvedBounds } from '@/lib/types';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { getDefinition, getSizingMode } from '@/lib/components';

interface Props {
  component: LabelComponent;
  bounds: ResolvedBounds;
  onDragStart?: (e: React.PointerEvent, componentId: string) => void;
  onMeasure?: (id: string, width: number, height: number) => void;
}

export function CanvasComponent({ component, bounds, onDragStart, onMeasure }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isSelected = useEditorStoreContext((s) => s.selectedComponentIds.includes(component.id));
  const storeApi = useEditorStoreApi();

  const def = getDefinition(component.typeData.type);
  const sizing = getSizingMode(component);
  // DOM measurement is only needed for components without computeContentSize
  // that are auto or width-only sized (i.e., text)
  const needsMeasure = !def.computeContentSize && (sizing === 'auto' || sizing === 'width-only');

  useEffect(() => {
    if (needsMeasure && ref.current && onMeasure) {
      const rect = ref.current.getBoundingClientRect();
      const zoom = storeApi.getState().viewport.zoom;
      onMeasure(component.id, rect.width / zoom, rect.height / zoom);
    }
  });

  const Element = def.Element;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: bounds.x,
    top: bounds.y,
    cursor: 'move',
  };

  if (sizing === 'fixed') {
    // Fixed components always use constraint-resolved bounds
    style.width = bounds.width;
    style.height = bounds.height;
  } else if (sizing === 'width-only') {
    // Width from constraints, height from content
    style.width = bounds.width;
  }
  // auto: no explicit width/height — content determines size

  return (
    <div
      ref={ref}
      style={style}
      onPointerDown={(e) => {
        if (onDragStart) onDragStart(e, component.id);
      }}
    >
      <Element props={component.typeData.props} isSelected={isSelected} />
    </div>
  );
}
