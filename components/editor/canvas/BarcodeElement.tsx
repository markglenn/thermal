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
}

export function BarcodeElement({ props }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

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
        textMargin: 1,
        margin: 0,
        background: 'transparent',
      });
    } catch {
      if (svgRef.current) {
        svgRef.current.innerHTML = '';
      }
    }
  }, [props.content, props.encoding, props.height, props.showText]);

  return <svg ref={svgRef} />;
}
