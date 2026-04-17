'use client';

import { useRef, useEffect, useState } from 'react';
import type { BarcodeProperties, BarcodeEncoding } from '@/lib/types';
import JsBarcode from 'jsbarcode';
import { computeTotalModules, deriveFitModuleWidth } from './compute-size';

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

export function BarcodeElement({ props, isSelected: _isSelected }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fitSize, setFitSize] = useState<{ width: number; height: number } | null>(null);

  const isFit = props.sizingMode === 'fit';

  let svgOffset = 0;
  if (isFit && fitSize) {
    const rotated = props.rotation === 90 || props.rotation === 270;
    const barAxis = rotated ? fitSize.height : fitSize.width;
    const total = computeTotalModules(props.encoding, props.content.length, props.showText);
    const mw = Math.max(1, deriveFitModuleWidth(barAxis, total));
    const slack = Math.max(0, barAxis - mw * total);
    const align = props.alignment ?? 'left';
    svgOffset = align === 'center' ? Math.floor(slack / 2) : align === 'right' ? slack : 0;
  }

  useEffect(() => {
    if (!isFit || !wrapperRef.current) return;
    const el = wrapperRef.current;
    const parent = el.parentElement;
    if (!parent) return;

    const read = () => {
      setFitSize({ width: parent.offsetWidth, height: parent.offsetHeight });
    };
    const observer = new ResizeObserver(() => read());
    observer.observe(parent);
    read();
    return () => observer.disconnect();
  }, [isFit]);

  useEffect(() => {
    if (!svgRef.current || !props.content) return;
    try {
      const rotated = props.rotation === 90 || props.rotation === 270;
      let mw: number;
      let height: number;

      if (isFit) {
        if (!fitSize) return;
        const barAxis = rotated ? fitSize.height : fitSize.width;
        const heightAxis = rotated ? fitSize.width : fitSize.height;
        const total = computeTotalModules(props.encoding, props.content.length, props.showText);
        mw = Math.max(1, deriveFitModuleWidth(barAxis, total));
        const textHeight = props.showText ? 10 * mw + 2 : 0;
        height = Math.max(1, heightAxis - textHeight);
      } else {
        mw = props.moduleWidth ?? 2;
        height = props.height;
      }

      const displayText = props.encoding === 'code39' ? `*${props.content}*` : undefined;
      JsBarcode(svgRef.current, props.content, {
        format: JSBARCODE_FORMAT[props.encoding],
        width: mw,
        height,
        displayValue: props.showText,
        text: displayText,
        font: 'Source Code Pro, monospace',
        fontSize: 10 * mw,
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
  }, [props.content, props.encoding, props.height, props.moduleWidth, props.showText, props.rotation, props.sizingMode, props.alignment, isFit, fitSize]);

  const rot = props.rotation;

  const ROTATION_STYLES: Record<number, React.CSSProperties> = {
    90: { transform: 'rotate(90deg) translateY(-100%)', transformOrigin: 'top left' },
    180: { transform: 'rotate(180deg)', transformOrigin: 'center' },
    270: { transform: 'rotate(-90deg) translateX(-100%)', transformOrigin: 'top left' },
  };

  const style: React.CSSProperties = {
    ...(ROTATION_STYLES[rot] ?? {}),
  };

  return (
    <div ref={wrapperRef} style={style}>
      <svg ref={svgRef} style={svgOffset > 0 ? { marginLeft: svgOffset } : undefined} />
    </div>
  );
}
