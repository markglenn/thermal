'use client';

import { useRef, useEffect } from 'react';
import type { LabelComponent, ResolvedBounds } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';
import { TextElement } from './canvas/TextElement';
import { BarcodeElement } from './canvas/BarcodeElement';
import { QrCodeElement } from './canvas/QrCodeElement';
import { LineElement } from './canvas/LineElement';
import { RectangleElement } from './canvas/RectangleElement';
import { ImageElement } from './canvas/ImageElement';
import { isAutoSized, hasFieldBlock } from '@/lib/component-traits';

interface Props {
  component: LabelComponent;
  bounds: ResolvedBounds;
  onDragStart?: (e: React.PointerEvent, componentId: string) => void;
  onMeasure?: (id: string, width: number, height: number) => void;
}

export function CanvasComponent({ component, bounds, onDragStart, onMeasure }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const selectedId = useEditorStore((s) => s.selectedComponentId);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const isSelected = selectedId === component.id;

  const fieldBlock = hasFieldBlock(component);
  const autoSize = isAutoSized(component);

  useEffect(() => {
    if ((autoSize || fieldBlock) && ref.current && onMeasure) {
      const rect = ref.current.getBoundingClientRect();
      const zoom = useEditorStore.getState().viewport.zoom;
      onMeasure(component.id, rect.width / zoom, rect.height / zoom);
    }
  });

  const style: React.CSSProperties = {
    position: 'absolute',
    left: bounds.x,
    top: bounds.y,
    cursor: 'default',
  };

  if (!autoSize) {
    style.width = bounds.width;
    if (!fieldBlock) {
      style.height = bounds.height;
    }
  }

  function renderContent() {
    switch (component.typeData.type) {
      case 'text':
        return <TextElement props={component.typeData.props} isSelected={isSelected && autoSize} />;
      case 'barcode':
        return <BarcodeElement props={component.typeData.props} isSelected={isSelected} />;
      case 'qrcode':
        return <QrCodeElement props={component.typeData.props} isSelected={isSelected} />;
      case 'line':
        return <LineElement props={component.typeData.props} />;
      case 'rectangle':
        return <RectangleElement props={component.typeData.props} />;
      case 'image':
        return <ImageElement />;
      default:
        return null;
    }
  }

  return (
    <div
      ref={ref}
      style={style}
      onPointerDown={(e) => {
        e.stopPropagation();
        selectComponent(component.id);
        if (onDragStart) onDragStart(e, component.id);
      }}
    >
      {renderContent()}
    </div>
  );
}
