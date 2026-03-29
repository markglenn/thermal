'use client';

import { useRef, useEffect, useState } from 'react';
import type { DataMatrixProperties } from '@/lib/types';
import { computeDataMatrixSize } from './compute-size';

interface Props {
  props: DataMatrixProperties;
  isSelected?: boolean;
}

export function DataMatrixElement({ props }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    import('bwip-js/browser').then((bwipjs) => {
      if (cancelled || !canvasRef.current) return;
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'datamatrix',
          text: props.content || ' ',
          scale: 3, // render quality — CSS size controls display dimensions
          paddingwidth: 0,
          paddingheight: 0,
        });
        setReady(true);
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
        setReady(true);
      }
    });

    return () => { cancelled = true; };
  }, [props.content, props.moduleSize]);

  // Use the computed ZPL size for display, not the canvas pixel dimensions
  const zplSize = computeDataMatrixSize(props);

  return (
    <canvas
      ref={canvasRef}
      width={0}
      height={0}
      style={ready ? {
        width: zplSize.width,
        height: zplSize.height,
        imageRendering: 'pixelated',
      } : { width: 0, height: 0 }}
    />
  );
}
