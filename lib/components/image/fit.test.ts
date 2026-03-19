import { describe, it, expect } from 'vitest';
import { containedSize, resolveImageLayout } from './fit';

describe('containedSize', () => {
  it('scales down to fit width-constrained box', () => {
    expect(containedSize(200, 200, 400, 200)).toEqual({ width: 200, height: 100 });
  });

  it('scales down to fit height-constrained box', () => {
    expect(containedSize(200, 200, 200, 400)).toEqual({ width: 100, height: 200 });
  });

  it('returns original size when image fits exactly', () => {
    expect(containedSize(100, 50, 100, 50)).toEqual({ width: 100, height: 50 });
  });

  it('caps at original size when box is larger', () => {
    // 50x25 image in 200x100 box → stays at 50x25 (no upscaling)
    expect(containedSize(200, 100, 50, 25)).toEqual({ width: 50, height: 25 });
  });

  it('handles wide box with square image', () => {
    expect(containedSize(200, 80, 100, 100)).toEqual({ width: 80, height: 80 });
  });

  it('returns at least 1x1', () => {
    expect(containedSize(1, 1, 1000, 1000)).toEqual({ width: 1, height: 1 });
  });
});

describe('resolveImageLayout', () => {
  it('stretch fills the entire box', () => {
    expect(resolveImageLayout(200, 100, 50, 50, 'stretch', 'center')).toEqual({
      width: 200, height: 100, offsetX: 0, offsetY: 0,
    });
  });

  it('fit centers by default', () => {
    // 100x50 image in 200x200 box → 100x50 (capped at original), centered
    expect(resolveImageLayout(200, 200, 100, 50, 'fit', 'center')).toEqual({
      width: 100, height: 50, offsetX: 50, offsetY: 75,
    });
  });

  it('fit top-left anchors to top-left', () => {
    expect(resolveImageLayout(200, 200, 100, 50, 'fit', 'top-left')).toEqual({
      width: 100, height: 50, offsetX: 0, offsetY: 0,
    });
  });

  it('fit bottom-right anchors to bottom-right', () => {
    expect(resolveImageLayout(200, 200, 100, 50, 'fit', 'bottom-right')).toEqual({
      width: 100, height: 50, offsetX: 100, offsetY: 150,
    });
  });

  it('fit top centers horizontally at top', () => {
    expect(resolveImageLayout(200, 200, 100, 50, 'fit', 'top')).toEqual({
      width: 100, height: 50, offsetX: 50, offsetY: 0,
    });
  });

  it('fit scales down when image is larger than box', () => {
    // 400x200 image in 200x200 box → 200x100, centered
    expect(resolveImageLayout(200, 200, 400, 200, 'fit', 'center')).toEqual({
      width: 200, height: 100, offsetX: 0, offsetY: 50,
    });
  });
});
