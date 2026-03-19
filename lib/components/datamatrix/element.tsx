'use client';

import { useRef, useEffect, useState } from 'react';
import type { DataMatrixProperties } from '@/lib/types';

interface Props {
  props: DataMatrixProperties;
  isSelected?: boolean;
}

export function DataMatrixElement({ props }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    import('bwip-js/browser').then((bwipjs) => {
      if (cancelled || !canvasRef.current) return;
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'datamatrix',
          text: props.content || ' ',
          scale: props.moduleSize,
        });

        // bwip-js sets canvas.width/height accounting for devicePixelRatio,
        // so the CSS display size must be divided by DPR to get the correct
        // dot-level dimensions.
        const dpr = window.devicePixelRatio || 1;
        const canvas = canvasRef.current;
        setDisplaySize({
          w: Math.round(canvas.width / dpr),
          h: Math.round(canvas.height / dpr),
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
  }, [props.content, props.moduleSize]);

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
