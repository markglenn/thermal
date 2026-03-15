'use client';

import { useRef, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { QrCodeProperties } from '@/lib/types';

interface Props {
  props: QrCodeProperties;
}

// ZPL ^BQ magnification = dots per module.
// Render QR at 1px per module, then scale up by magnification.
export function QrCodeElement({ props }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [moduleCount, setModuleCount] = useState(21);

  // Detect actual module count from the rendered SVG
  useEffect(() => {
    if (!wrapperRef.current) return;
    const svg = wrapperRef.current.querySelector('svg');
    if (!svg) return;
    // qrcode.react sets viewBox to "0 0 <modules> <modules>"
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(' ');
      const modules = parseInt(parts[2]);
      if (modules > 0 && modules !== moduleCount) {
        setModuleCount(modules);
      }
    }
  });

  const size = moduleCount * props.magnification;

  return (
    <div ref={wrapperRef}>
      <QRCodeSVG
        value={props.content || ' '}
        size={size}
        level={props.errorCorrection}
        marginSize={0}
      />
    </div>
  );
}
