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

interface Props {
  component: LabelComponent;
  bounds: ResolvedBounds;
  onDragStart?: (e: React.PointerEvent, componentId: string) => void;
  onMeasure?: (id: string, width: number, height: number) => void;
}

const AUTO_SIZED_TYPES = new Set(['text', 'barcode']);

export function CanvasComponent({ component, bounds, onDragStart, onMeasure }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const selectedId = useEditorStore((s) => s.selectedComponentId);
  const selectComponent = useEditorStore((s) => s.selectComponent);

  const autoSize = AUTO_SIZED_TYPES.has(component.typeData.type);

  useEffect(() => {
    if (autoSize && ref.current && onMeasure) {
      const { offsetWidth, offsetHeight } = ref.current;
      onMeasure(component.id, offsetWidth, offsetHeight);
    }
  });

  const style: React.CSSProperties = {
    position: 'absolute',
    left: bounds.x,
    top: bounds.y,
    ...(autoSize ? {} : { width: bounds.width, height: bounds.height }),
    cursor: 'default',
  };

  function renderContent() {
    switch (component.typeData.type) {
      case 'text':
        return <TextElement props={component.typeData.props} />;
      case 'barcode':
        return <BarcodeElement props={component.typeData.props} />;
      case 'qrcode':
        return <QrCodeElement />;
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
