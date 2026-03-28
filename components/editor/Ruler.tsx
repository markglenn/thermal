'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useViewport, useLabelConfig, useActiveVariant } from '@/lib/store/editor-context';
import { labelWidthDots, labelHeightDots } from '@/lib/constants';
import {
  RULER_SIZE,
  dotToScreen,
  computeTickInterval,
  computeVisibleDotRange,
} from './ruler-utils';

import type { ResolvedBounds } from '@/lib/types';

const BG_COLOR = '#f8f9fa';
const TICK_COLOR = '#6b7280';
const TEXT_COLOR = '#6b7280';
const INCH_COLOR = '#3b82f6';
const SELECTION_COLOR = 'rgba(59, 130, 246, 0.15)';
const LABEL_EXTENT_COLOR = '#9ca3af';
const CURSOR_COLOR = '#ef4444';
const BORDER_COLOR = '#d1d5db';
const MAJOR_TICK = 12;
const MINOR_TICK = 6;

interface RulerProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  selectionBounds: ResolvedBounds | null;
}

function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);
  return ctx;
}

function drawLabelExtentH(
  ctx: CanvasRenderingContext2D,
  width: number,
  zoom: number,
  panX: number,
  labelWidth: number,
) {
  const s0 = dotToScreen(0, width, panX, zoom, labelWidth);
  const sEnd = dotToScreen(labelWidth, width, panX, zoom, labelWidth);

  ctx.strokeStyle = LABEL_EXTENT_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const sx of [s0, sEnd]) {
    if (sx < RULER_SIZE || sx > width) continue;
    const rx = Math.round(sx) + 0.5;
    ctx.moveTo(rx, 0);
    ctx.lineTo(rx, RULER_SIZE);
  }
  ctx.stroke();
}

function drawLabelExtentV(
  ctx: CanvasRenderingContext2D,
  height: number,
  zoom: number,
  panY: number,
  labelHeight: number,
) {
  const s0 = dotToScreen(0, height, panY, zoom, labelHeight);
  const sEnd = dotToScreen(labelHeight, height, panY, zoom, labelHeight);

  ctx.strokeStyle = LABEL_EXTENT_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const sy of [s0, sEnd]) {
    if (sy < RULER_SIZE || sy > height) continue;
    const ry = Math.round(sy) + 0.5;
    ctx.moveTo(0, ry);
    ctx.lineTo(RULER_SIZE, ry);
  }
  ctx.stroke();
}

function drawHorizontalRuler(
  ctx: CanvasRenderingContext2D,
  width: number,
  zoom: number,
  panX: number,
  labelWidth: number,
  dpi: number,
  cursorX: number | null,
  selectionBounds: ResolvedBounds | null,
) {
  ctx.clearRect(0, 0, width, RULER_SIZE);

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, RULER_SIZE);

  // Selection highlight band
  if (selectionBounds) {
    const sx1 = dotToScreen(selectionBounds.x, width, panX, zoom, labelWidth);
    const sx2 = dotToScreen(selectionBounds.x + selectionBounds.width, width, panX, zoom, labelWidth);
    const left = Math.max(RULER_SIZE, Math.round(sx1));
    const right = Math.min(width, Math.round(sx2));
    if (right > left) {
      ctx.fillStyle = SELECTION_COLOR;
      ctx.fillRect(left, 0, right - left, RULER_SIZE);
    }
  }

  // Bottom border
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, RULER_SIZE - 0.5);
  ctx.lineTo(width, RULER_SIZE - 0.5);
  ctx.stroke();

  // Label extent markers
  drawLabelExtentH(ctx, width, zoom, panX, labelWidth);

  // Ticks
  const interval = computeTickInterval(zoom);
  const minorInterval = interval / 5;
  const { start, end } = computeVisibleDotRange(width, panX, zoom, labelWidth, 0);

  // Minor ticks
  ctx.strokeStyle = TICK_COLOR;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  const minorStart = Math.floor(start / minorInterval) * minorInterval;
  for (let d = minorStart; d <= end; d += minorInterval) {
    const sx = dotToScreen(d, width, panX, zoom, labelWidth);
    if (sx < RULER_SIZE || sx > width) continue;
    ctx.moveTo(Math.round(sx) + 0.5, RULER_SIZE);
    ctx.lineTo(Math.round(sx) + 0.5, RULER_SIZE - MINOR_TICK);
  }
  ctx.stroke();

  // Major ticks + labels
  ctx.lineWidth = 1;
  ctx.beginPath();
  const majorStart = Math.floor(start / interval) * interval;
  for (let d = majorStart; d <= end; d += interval) {
    const sx = dotToScreen(d, width, panX, zoom, labelWidth);
    if (sx < RULER_SIZE || sx > width) continue;
    ctx.moveTo(Math.round(sx) + 0.5, RULER_SIZE);
    ctx.lineTo(Math.round(sx) + 0.5, RULER_SIZE - MAJOR_TICK);
  }
  ctx.stroke();

  // Labels
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (let d = majorStart; d <= end; d += interval) {
    const sx = dotToScreen(d, width, panX, zoom, labelWidth);
    if (sx < RULER_SIZE || sx > width) continue;
    ctx.fillText(String(Math.round(d)), Math.round(sx) + 3, 2);
  }

  // Inch markers
  ctx.strokeStyle = INCH_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const inchStart = Math.max(0, Math.ceil(start / dpi));
  const inchEnd = Math.floor(end / dpi);
  for (let i = inchStart; i <= inchEnd; i++) {
    const sx = dotToScreen(i * dpi, width, panX, zoom, labelWidth);
    if (sx < RULER_SIZE || sx > width) continue;
    ctx.moveTo(Math.round(sx) + 0.5, RULER_SIZE);
    ctx.lineTo(Math.round(sx) + 0.5, RULER_SIZE - MAJOR_TICK - 2);
  }
  ctx.stroke();

  // Cursor indicator
  if (cursorX !== null && cursorX >= RULER_SIZE && cursorX <= width) {
    ctx.fillStyle = CURSOR_COLOR;
    ctx.beginPath();
    ctx.moveTo(cursorX - 4, 0);
    ctx.lineTo(cursorX + 4, 0);
    ctx.lineTo(cursorX, 6);
    ctx.closePath();
    ctx.fill();
  }
}

function drawVerticalRuler(
  ctx: CanvasRenderingContext2D,
  height: number,
  zoom: number,
  panY: number,
  labelHeight: number,
  dpi: number,
  cursorY: number | null,
  selectionBounds: ResolvedBounds | null,
) {
  ctx.clearRect(0, 0, RULER_SIZE, height);

  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, RULER_SIZE, height);

  // Selection highlight band
  if (selectionBounds) {
    const sy1 = dotToScreen(selectionBounds.y, height, panY, zoom, labelHeight);
    const sy2 = dotToScreen(selectionBounds.y + selectionBounds.height, height, panY, zoom, labelHeight);
    const top = Math.max(RULER_SIZE, Math.round(sy1));
    const bottom = Math.min(height, Math.round(sy2));
    if (bottom > top) {
      ctx.fillStyle = SELECTION_COLOR;
      ctx.fillRect(0, top, RULER_SIZE, bottom - top);
    }
  }

  // Right border
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(RULER_SIZE - 0.5, 0);
  ctx.lineTo(RULER_SIZE - 0.5, height);
  ctx.stroke();

  // Label extent markers
  drawLabelExtentV(ctx, height, zoom, panY, labelHeight);

  // Ticks
  const interval = computeTickInterval(zoom);
  const minorInterval = interval / 5;
  const { start, end } = computeVisibleDotRange(height, panY, zoom, labelHeight, 0);

  // Minor ticks
  ctx.strokeStyle = TICK_COLOR;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  const minorStart = Math.floor(start / minorInterval) * minorInterval;
  for (let d = minorStart; d <= end; d += minorInterval) {
    const sy = dotToScreen(d, height, panY, zoom, labelHeight);
    if (sy < RULER_SIZE || sy > height) continue;
    ctx.moveTo(RULER_SIZE, Math.round(sy) + 0.5);
    ctx.lineTo(RULER_SIZE - MINOR_TICK, Math.round(sy) + 0.5);
  }
  ctx.stroke();

  // Major ticks
  ctx.lineWidth = 1;
  ctx.beginPath();
  const majorStart = Math.floor(start / interval) * interval;
  for (let d = majorStart; d <= end; d += interval) {
    const sy = dotToScreen(d, height, panY, zoom, labelHeight);
    if (sy < RULER_SIZE || sy > height) continue;
    ctx.moveTo(RULER_SIZE, Math.round(sy) + 0.5);
    ctx.lineTo(RULER_SIZE - MAJOR_TICK, Math.round(sy) + 0.5);
  }
  ctx.stroke();

  // Labels (rotated)
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = '9px system-ui, sans-serif';
  for (let d = majorStart; d <= end; d += interval) {
    const sy = dotToScreen(d, height, panY, zoom, labelHeight);
    if (sy < RULER_SIZE || sy > height) continue;
    ctx.save();
    ctx.translate(2, Math.round(sy) - 3);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(Math.round(d)), 0, 0);
    ctx.restore();
  }

  // Inch markers
  ctx.strokeStyle = INCH_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const inchStart = Math.max(0, Math.ceil(start / dpi));
  const inchEnd = Math.floor(end / dpi);
  for (let i = inchStart; i <= inchEnd; i++) {
    const sy = dotToScreen(i * dpi, height, panY, zoom, labelHeight);
    if (sy < RULER_SIZE || sy > height) continue;
    ctx.moveTo(RULER_SIZE, Math.round(sy) + 0.5);
    ctx.lineTo(RULER_SIZE - MAJOR_TICK - 2, Math.round(sy) + 0.5);
  }
  ctx.stroke();

  // Cursor indicator
  if (cursorY !== null && cursorY >= RULER_SIZE && cursorY <= height) {
    ctx.fillStyle = CURSOR_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, cursorY - 4);
    ctx.lineTo(0, cursorY + 4);
    ctx.lineTo(6, cursorY);
    ctx.closePath();
    ctx.fill();
  }
}

export function Ruler({ canvasRef, selectionBounds }: RulerProps) {
  const hCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number } | null>(null);

  const viewport = useViewport();
  const label = useLabelConfig();
  const activeVariant = useActiveVariant();
  const widthDots = labelWidthDots(label, activeVariant);
  const heightDots = labelHeightDots(label, activeVariant);

  // ResizeObserver to track canvas container dimensions
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setCanvasSize({ w: width, h: height });
    });

    observer.observe(canvasEl);
    return () => observer.disconnect();
  }, [canvasRef]);

  // Draw rulers
  useEffect(() => {
    if (!canvasSize) return;

    const { w, h } = canvasSize;
    const cursor = cursorRef.current;

    const hCanvas = hCanvasRef.current;
    if (hCanvas) {
      const ctx = setupCanvas(hCanvas, w, RULER_SIZE);
      if (ctx) {
        drawHorizontalRuler(ctx, w, viewport.zoom, viewport.panX, widthDots, label.dpi, cursor?.x ?? null, selectionBounds);
      }
    }

    const vCanvas = vCanvasRef.current;
    if (vCanvas) {
      const ctx = setupCanvas(vCanvas, RULER_SIZE, h);
      if (ctx) {
        drawVerticalRuler(ctx, h, viewport.zoom, viewport.panY, heightDots, label.dpi, cursor?.y ?? null, selectionBounds);
      }
    }
  }, [canvasSize, viewport.zoom, viewport.panX, viewport.panY, widthDots, heightDots, label.dpi, selectionBounds]);

  // Cursor tracking
  const redrawCursor = useCallback(() => {
    if (!canvasSize) return;

    const { w, h } = canvasSize;
    const cursor = cursorRef.current;

    const hCanvas = hCanvasRef.current;
    if (hCanvas) {
      const ctx = hCanvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawHorizontalRuler(ctx, w, viewport.zoom, viewport.panX, widthDots, label.dpi, cursor?.x ?? null, selectionBounds);
      }
    }

    const vCanvas = vCanvasRef.current;
    if (vCanvas) {
      const ctx = vCanvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawVerticalRuler(ctx, h, viewport.zoom, viewport.panY, heightDots, label.dpi, cursor?.y ?? null, selectionBounds);
      }
    }
  }, [canvasSize, viewport.zoom, viewport.panX, viewport.panY, widthDots, heightDots, label.dpi, selectionBounds]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleMove = (e: PointerEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      cursorRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(redrawCursor);
    };

    const handleLeave = () => {
      cursorRef.current = null;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(redrawCursor);
    };

    canvasEl.addEventListener('pointermove', handleMove);
    canvasEl.addEventListener('pointerleave', handleLeave);
    return () => {
      canvasEl.removeEventListener('pointermove', handleMove);
      canvasEl.removeEventListener('pointerleave', handleLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef, redrawCursor]);

  return (
    <>
      {/* Horizontal ruler */}
      <canvas
        ref={hCanvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: '100%', height: RULER_SIZE, zIndex: 10 }}
      />

      {/* Vertical ruler */}
      <canvas
        ref={vCanvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: RULER_SIZE, height: '100%', zIndex: 10 }}
      />

      {/* Corner square */}
      <div
        className="absolute top-0 left-0 flex items-center justify-center pointer-events-none"
        style={{
          width: RULER_SIZE,
          height: RULER_SIZE,
          backgroundColor: BG_COLOR,
          borderRight: `1px solid ${BORDER_COLOR}`,
          borderBottom: `1px solid ${BORDER_COLOR}`,
          zIndex: 11,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-gray-400">
          <path d="M1 1L5 1L5 5L9 5L9 9L1 9Z" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </>
  );
}
