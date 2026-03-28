'use client';

import { useRef, useEffect, useCallback, memo } from 'react';
import type { LabelComponent, ResolvedBounds } from '@/lib/types';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { getDefinition, getSizingMode } from '@/lib/components';
import { showComponentContextMenu } from '../shared/component-context-menu';
import { useFlashIds } from '@/lib/undo-flash-store';

interface Props {
  component: LabelComponent;
  bounds: ResolvedBounds;
  onDragStart?: (e: React.PointerEvent, componentId: string) => void;
  onMeasure?: (id: string, width: number, height: number) => void;
}

function boundsEqual(a: ResolvedBounds, b: ResolvedBounds) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export const CanvasComponent = memo(function CanvasComponent({ component, bounds, onDragStart, onMeasure }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isSelected = useEditorStoreContext((s) => s.selectedComponentIds.includes(component.id));
  const isFlashing = useFlashIds().has(component.id);
  const storeApi = useEditorStoreApi();

  const def = getDefinition(component.typeData.type);
  const sizing = getSizingMode(component);
  // DOM measurement is only needed for components without computeContentSize
  // that are auto or width-only sized (i.e., text)
  const needsMeasure = !def.computeContentSize && (sizing === 'auto' || sizing === 'width-only');

  useEffect(() => {
    if (needsMeasure && ref.current && onMeasure) {
      // Measure the first child (the actual rendered element) rather than the
      // wrapper div, because CSS transforms (scaleX/scaleY) on the child affect
      // its visual bounds but don't expand the parent's layout box.
      const target = ref.current.firstElementChild ?? ref.current;
      const rect = target.getBoundingClientRect();
      const zoom = storeApi.getState().viewport.zoom;
      let w = rect.width / zoom;
      let h = rect.height / zoom;
      // For rotated text (90/270), the CSS transform is on the child element,
      // so the wrapper div's rect is unrotated. Swap dimensions to match visual bounds.
      const rotation = (component.typeData.props as { rotation?: number }).rotation;
      if (rotation === 90 || rotation === 270) {
        [w, h] = [h, w];
      }
      onMeasure(component.id, w, h);
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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    showComponentContextMenu(e, component, storeApi);
  }, [component, storeApi]);

  return (
    <div
      ref={ref}
      style={style}
      className={isFlashing ? 'undo-flash' : undefined}
      data-testid={`canvas-component-${component.id}`}
      data-component-type={component.typeData.type}
      onPointerDown={(e) => {
        if (onDragStart) onDragStart(e, component.id);
      }}
      onContextMenu={handleContextMenu}
    >
      <Element props={component.typeData.props} isSelected={isSelected} />
    </div>
  );
}, (prev, next) =>
  prev.component === next.component &&
  boundsEqual(prev.bounds, next.bounds) &&
  prev.onDragStart === next.onDragStart &&
  prev.onMeasure === next.onMeasure
);
