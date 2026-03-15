'use client';

import { useRef, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { QrCodeProperties } from '@/lib/types';

interface Props {
  props: QrCodeProperties;
}

// ZPL ^BQ renders QR with no left margin but a small top gap.
// Render with no quiet zone and let the container handle positioning.
export function QrCodeElement({ props }: Props) {
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
