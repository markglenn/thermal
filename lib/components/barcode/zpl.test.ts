import { describe, it, expect } from 'vitest';
import { barcodeCommand } from './zpl';
import type { BarcodeProperties, ResolvedBounds } from '@/lib/types';

function makeProps(overrides: Partial<BarcodeProperties> = {}): BarcodeProperties {
  return {
    content: '12345',
    encoding: 'code128',
    height: 80,
    showText: false,
    rotation: 0,
    ...overrides,
  };
}

const BOUNDS: ResolvedBounds = { x: 10, y: 20, width: 200, height: 80 };

describe('barcodeCommand', () => {
  it('auto mode uses stored moduleWidth', () => {
    const lines = barcodeCommand(makeProps({ moduleWidth: 3 }), BOUNDS);
    expect(lines).toContain('^BY3');
  });

  it('auto mode defaults moduleWidth to 2', () => {
    const lines = barcodeCommand(makeProps(), BOUNDS);
    expect(lines).toContain('^BY2');
  });

  it('fit mode derives moduleWidth from bounds width', () => {
    // 90 modules, 200 / 90 = 2
    const lines = barcodeCommand(makeProps({ sizingMode: 'fit' }), BOUNDS);
    expect(lines).toContain('^BY2');
  });

  it('fit mode uses bounds height for barcode height', () => {
    const lines = barcodeCommand(
      makeProps({ sizingMode: 'fit' }),
      { x: 0, y: 0, width: 200, height: 100 },
    );
    expect(lines).toContain('^BCN,100,N,N');
  });

  it('fit mode for rotated barcode uses height as bar axis', () => {
    // Rotated: barAxisLength = bounds.height = 180, total modules = 90 → mw = 2
    const lines = barcodeCommand(
      makeProps({ sizingMode: 'fit', rotation: 90 }),
      { x: 0, y: 0, width: 100, height: 180 },
    );
    expect(lines).toContain('^BY2');
    // Height becomes bounds.width = 100
    expect(lines).toContain('^BCR,100,N,N');
  });

  it('fit mode clamps moduleWidth to 1 when content too wide for box', () => {
    // 90 modules, box 50 → 0.55 → derive returns 0, clamped to 1
    const lines = barcodeCommand(
      makeProps({ sizingMode: 'fit' }),
      { x: 0, y: 0, width: 50, height: 80 },
    );
    expect(lines).toContain('^BY1');
  });

  it('fit mode left alignment (default) keeps origin at bounds.x', () => {
    // 90 modules, box 200, mw=2 → rendered=180, slack=20, left=0 offset
    const lines = barcodeCommand(
      makeProps({ sizingMode: 'fit' }),
      { x: 10, y: 20, width: 200, height: 80 },
    );
    expect(lines[0]).toBe('^FO10,20');
  });

  it('fit mode center alignment offsets origin by half the slack', () => {
    // slack 20 → offset 10
    const lines = barcodeCommand(
      makeProps({ sizingMode: 'fit', alignment: 'center' }),
      { x: 10, y: 20, width: 200, height: 80 },
    );
    expect(lines[0]).toBe('^FO20,20');
  });

  it('fit mode right alignment offsets origin by full slack', () => {
    const lines = barcodeCommand(
      makeProps({ sizingMode: 'fit', alignment: 'right' }),
      { x: 10, y: 20, width: 200, height: 80 },
    );
    expect(lines[0]).toBe('^FO30,20');
  });

  it('fit mode center alignment with rotation offsets Y instead of X', () => {
    // rotated 90: barAxis = height = 200, mw=2, rendered=180, slack=20 → Y offset 10
    const lines = barcodeCommand(
      makeProps({ sizingMode: 'fit', alignment: 'center', rotation: 90 }),
      { x: 10, y: 20, width: 80, height: 200 },
    );
    expect(lines[0]).toBe('^FO10,30');
  });

  it('fit mode with showText subtracts text height from bar height', () => {
    // mw=2, textHeight = 10*2+2 = 22; bounds 100 - 22 = 78
    const lines = barcodeCommand(
      makeProps({ sizingMode: 'fit', showText: true }),
      { x: 0, y: 0, width: 200, height: 100 },
    );
    expect(lines).toContain('^BCN,78,Y,N');
  });
});
