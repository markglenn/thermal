'use client';

import type { LabelComponent, ResolvedBounds } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';
import { CanvasComponent } from './CanvasComponent';

interface Props {
  component: LabelComponent;
  bounds: ResolvedBounds;
  boundsMap: Map<string, ResolvedBounds>;
}

export function ContainerComponent({ component, bounds, boundsMap }: Props) {
  const selectedId = useEditorStore((s) => s.selectedComponentId);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const isSelected = selectedId === component.id;

  return (
    <div
      style={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        selectComponent(component.id);
      }}
    >
      {/* Container visual indicator */}
      <div
        className="absolute inset-0 border border-dashed border-gray-300 pointer-events-none"
        style={{ borderColor: isSelected ? '#3b82f6' : '#d1d5db' }}
      />
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
      )}
      {/* Render children */}
      {component.children?.map((child) => {
        const childBounds = boundsMap.get(child.id);
        if (!childBounds) return null;
        if (child.typeData.type === 'container') {
          return (
            <ContainerComponent
              key={child.id}
              component={child}
              bounds={childBounds}
              boundsMap={boundsMap}
            />
          );
        }
        return (
          <CanvasComponent
            key={child.id}
            component={child}
            bounds={childBounds}
          />
        );
      })}
    </div>
  );
}
