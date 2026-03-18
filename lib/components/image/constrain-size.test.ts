import { describe, it, expect } from 'vitest';
import { constrainImageSize } from './constrain-size';
import type { ImageProperties, ComponentLayout } from '@/lib/types';

const baseProps: ImageProperties = {
  data: 'data:image/png;base64,abc',
  originalWidth: 200,
  originalHeight: 100,
  threshold: 128,
  invert: false,
  monochromeMethod: 'threshold',
  monochromePreview: '',
  monochromePreviewFull: '',
  zplHex: '',
  zplBytesPerRow: 0,
  zplWidth: 0,
  zplHeight: 0,
};

const baseLayout: ComponentLayout = {
  x: 0, y: 0, width: 200, height: 100,
  horizontalAnchor: 'left', verticalAnchor: 'top',
};

describe('constrainImageSize', () => {
  it('scales height proportionally when width changes', () => {
    const result = constrainImageSize(baseProps, baseLayout, { width: 100 });
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('scales width proportionally when height changes', () => {
    const result = constrainImageSize(baseProps, baseLayout, { height: 50 });
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('clamps width to original dimensions', () => {
    const result = constrainImageSize(baseProps, baseLayout, { width: 999 });
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('clamps height to original dimensions', () => {
    const result = constrainImageSize(baseProps, baseLayout, { height: 999 });
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('enforces minimum size', () => {
    const result = constrainImageSize(baseProps, baseLayout, { width: 1 });
    expect(result.width!).toBeGreaterThanOrEqual(10);
    expect(result.height!).toBeGreaterThanOrEqual(10);
  });

  it('passes through change when no original dimensions', () => {
    const noOriginal = { ...baseProps, originalWidth: 0, originalHeight: 0 };
    const result = constrainImageSize(noOriginal, baseLayout, { width: 50 });
    expect(result).toEqual({ width: 50 });
  });
});
