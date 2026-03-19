'use client';

import { useRef, useEffect, useState } from 'react';
import type { Pdf417Properties } from '@/lib/types';

interface Props {
  props: Pdf417Properties;
  isSelected?: boolean;
}

export function Pdf417Element({ props }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    import('bwip-js/browser').then((bwipjs) => {
      if (cancelled || !canvasRef.current) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opts: any = {
          bcid: 'pdf417',
          text: props.content || ' ',
          scale: 2,
          columns: props.columns,
          eclevel: props.securityLevel,
          height: props.rowHeight,
        };
        bwipjs.toCanvas(canvasRef.current, opts);

        const canvas = canvasRef.current;
        setDisplaySize({
          w: canvas.width,
          h: canvas.height,
        });
      } catch (err) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = 100;
        canvas.height = 20;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#dc2626';
        ctx.font = '12px sans-serif';
        ctx.fillText(err instanceof Error ? err.message : 'Invalid', 4, 14);
        setDisplaySize({ w: 100, h: 20 });
      }
    });

    return () => { cancelled = true; };
  }, [props.content, props.columns, props.securityLevel, props.rowHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={0}
      height={0}
      style={displaySize ? {
        width: displaySize.w,
        height: displaySize.h,
        imageRendering: 'pixelated',
      } : { width: 0, height: 0 }}
    />
  );
}
