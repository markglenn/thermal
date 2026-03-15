'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { LabelComponent, ResolvedBounds, BarcodeEncoding } from '@/lib/types';
import { useEditorStore } from '@/lib/store/editor-store';
import { ZPL_FONT_FAMILY, ZPL_FONT_WEIGHT } from '@/lib/constants';
import JsBarcode from 'jsbarcode';

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

  const isText = component.typeData.type === 'text';
  const isBarcode = component.typeData.type === 'barcode';
  const autoSize = isText || isBarcode;

  // Report actual measured size for auto-sized components
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
      case 'text': {
        const font = component.typeData.props.font;
        return (
          <div
            className="whitespace-nowrap text-black"
            style={{
              fontSize: component.typeData.props.fontSize,
              lineHeight: 1,
              fontFamily: ZPL_FONT_FAMILY[font] || ZPL_FONT_FAMILY['0'],
              fontWeight: ZPL_FONT_WEIGHT[font] || 400,
              letterSpacing: font === '0' ? '-0.027em' : '0.05em',
              // Compensate for CSS ascender gap — ZPL positions at glyph top, not line box top
              marginTop: font === '0' ? '-0.12em' : '-0.08em',
            }}
          >
            {component.typeData.props.content}
          </div>
        );
      }
      case 'barcode': {
        const bcProps = component.typeData.props;
        // ZPL ^BC uses Code 128 subset B (one symbol per character)
        const jsBarcodeFormat: Record<BarcodeEncoding, string> = {
          code128: 'CODE128B',
          code39: 'CODE39',
          ean13: 'EAN13',
          upca: 'UPC',
          itf: 'ITF',
        };
        return (
          <BarcodeRenderer
            content={bcProps.content}
            format={jsBarcodeFormat[bcProps.encoding]}
            height={bcProps.height}
            showText={bcProps.showText}
          />
        );
      }
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

function BarcodeRenderer({
  content,
  format,
  height,
  showText,
}: {
  content: string;
  format: string;
  height: number;
  showText: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !content) return;
    try {
      JsBarcode(svgRef.current, content, {
        format,
        width: 2,
        height,
        displayValue: showText,
        font: 'Source Code Pro, monospace',
        fontSize: 22,
        fontOptions: '',
        textMargin: 1,
        margin: 0,
        background: 'transparent',
      });
    } catch {
      // Invalid barcode data — show placeholder
      if (svgRef.current) {
        svgRef.current.innerHTML = '';
      }
    }
  }, [content, format, height, showText]);

  return <svg ref={svgRef} />;
}
