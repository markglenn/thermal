'use client';

import { useRef, useEffect } from 'react';
import type { BarcodeProperties, BarcodeEncoding } from '@/lib/types';
import JsBarcode from 'jsbarcode';

const JSBARCODE_FORMAT: Record<BarcodeEncoding, string> = {
  code128: 'CODE128B',
  code39: 'CODE39',
  ean13: 'EAN13',
  upca: 'UPC',
  itf: 'ITF',
};

interface Props {
  props: BarcodeProperties;
  isSelected?: boolean;
}

export function BarcodeElement({ props, isSelected }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !props.content) return;
    try {
      JsBarcode(svgRef.current, props.content, {
        format: JSBARCODE_FORMAT[props.encoding],
        width: 2,
        height: props.height,
        displayValue: props.showText,
        font: 'Source Code Pro, monospace',
        fontSize: 22,
        fontOptions: '',
        textMargin: -1,
        margin: 0,
        background: 'transparent',
      });
    } catch (err) {
      if (svgRef.current) {
        const msg = err instanceof Error ? err.message : 'Invalid barcode';
        svgRef.current.innerHTML = `<text x="4" y="16" font-size="12" fill="#dc2626" font-family="sans-serif">${msg}</text>`;
      }
    }
  }, [props.content, props.encoding, props.height, props.showText]);

  const rot = props.rotation;

  const ROTATION_STYLES: Record<number, React.CSSProperties> = {
    90: { transform: 'rotate(90deg) translateY(-100%)', transformOrigin: 'top left' },
    180: { transform: 'rotate(180deg)', transformOrigin: 'center' },
    270: { transform: 'rotate(-90deg) translateX(-100%)', transformOrigin: 'top left' },
  };

  const style: React.CSSProperties = {
    ...(ROTATION_STYLES[rot] ?? {}),
    ...(isSelected ? { outline: '2px solid #3b82f6' } : {}),
  };

  return (
    <div ref={wrapperRef} style={style}>
      <svg ref={svgRef} />
    </div>
  );
}
