'use client';

import { useRef, useEffect } from 'react';
import type { LabelComponent, ResolvedBounds } from '@/lib/types';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { getDefinition } from '@/lib/components';

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
  const needsMeasure = !def.computeContentSize;

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

  if (needsMeasure) {
    // Let content determine size — DOM measurement will feed back into absoluteBoundsMap
  } else {
    style.width = bounds.width;
    style.height = bounds.height;
  }

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
