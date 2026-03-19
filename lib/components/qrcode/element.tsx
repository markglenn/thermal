'use client';

import { useRef, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { QrCodeProperties } from '@/lib/types';

interface Props {
  props: QrCodeProperties;
  isSelected?: boolean;
}

// ZPL ^BQ adds a fixed 10-dot quiet zone above the QR code (empirically
// measured across magnifications 1–10 and DPI 203/300/600 via Labelary).
const ZPL_QR_TOP_GAP = 10;

export function QrCodeElement({ props, isSelected: _isSelected }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [moduleCount, setModuleCount] = useState(21);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const svg = wrapperRef.current.querySelector('svg');
    if (!svg) return;
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(' ');
      const total = parseInt(parts[2]);
      if (total > 0 && total !== moduleCount) {
        setModuleCount(total);
      }
    }
  }, [moduleCount, props.content, props.errorCorrection]);

  const size = moduleCount * props.magnification;

  return (
    <div ref={wrapperRef} style={{ paddingTop: ZPL_QR_TOP_GAP }}>
      <QRCodeSVG
        value={props.content || ' '}
        size={size}
        level={props.errorCorrection}
        marginSize={0}
        bgColor="transparent"
      />
    </div>
  );
}
