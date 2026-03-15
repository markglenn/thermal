'use client';

import type { LabelComponent, ResolvedBounds } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';

interface Props {
  component: LabelComponent;
  bounds: ResolvedBounds;
  onDragStart?: (e: React.PointerEvent, componentId: string) => void;
}

export function CanvasComponent({ component, bounds, onDragStart }: Props) {
  const selectedId = useEditorStore((s) => s.selectedComponentId);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const isSelected = selectedId === component.id;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    cursor: 'default',
  };

  function renderContent() {
    switch (component.typeData.type) {
      case 'text':
        return (
          <div
            className="w-full h-full flex items-center overflow-hidden whitespace-nowrap text-black"
            style={{ fontSize: component.typeData.props.fontSize * 0.75 }}
          >
            {component.typeData.props.content}
          </div>
        );
      case 'barcode':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center border border-gray-400 bg-white">
            <div className="flex-1 w-full flex items-center justify-center">
              <div className="flex gap-px h-3/4">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-black"
                    style={{ width: Math.random() > 0.5 ? 2 : 1, height: '100%' }}
                  />
                ))}
              </div>
            </div>
            {component.typeData.props.showText && (
              <div className="text-xs text-black text-center pb-0.5">
                {component.typeData.props.content}
              </div>
            )}
          </div>
        );
      case 'qrcode':
        return (
          <div className="w-full h-full border border-gray-400 bg-white flex items-center justify-center">
            <svg viewBox="0 0 10 10" className="w-3/4 h-3/4">
              <rect x="0" y="0" width="3" height="3" fill="black" />
              <rect x="7" y="0" width="3" height="3" fill="black" />
              <rect x="0" y="7" width="3" height="3" fill="black" />
              <rect x="4" y="4" width="2" height="2" fill="black" />
            </svg>
          </div>
        );
      case 'line': {
        const isHorizontal = component.typeData.props.orientation === 'horizontal';
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="bg-black"
              style={{
                width: isHorizontal ? '100%' : component.typeData.props.thickness,
                height: isHorizontal ? component.typeData.props.thickness : '100%',
              }}
            />
          </div>
        );
      }
      case 'rectangle':
        return (
          <div
            className="w-full h-full"
            style={{
              border: component.typeData.props.filled
                ? 'none'
                : `${component.typeData.props.borderThickness}px solid black`,
              backgroundColor: component.typeData.props.filled ? 'black' : 'transparent',
              borderRadius: component.typeData.props.cornerRadius,
            }}
          />
        );
      case 'image':
        return (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
            Image
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div
      style={style}
      onPointerDown={(e) => {
        e.stopPropagation();
        selectComponent(component.id);
        if (onDragStart) onDragStart(e, component.id);
      }}
    >
      {renderContent()}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
      )}
    </div>
  );
}
