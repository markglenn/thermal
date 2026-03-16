import { describe, it, expect } from 'vitest';
import { generateTextZpl } from './text/zpl';
import { barcodeCommand } from './barcode/zpl';
import { qrcodeCommand } from './qrcode/zpl';
import { rectangleZpl } from './rectangle/zpl';
import { lineZpl } from './line/zpl';
import { containerZpl } from './container/zpl';
import { imageZpl } from './image/zpl';
import type { ResolvedBounds } from './../types';

const bounds: ResolvedBounds = { x: 50, y: 100, width: 200, height: 80 };

describe('generateTextZpl', () => {
  it('generates basic text', () => {
    const result = generateTextZpl(
      { content: 'Hello', font: '0', fontSize: 30, fontWidth: 25, rotation: 0 },
      bounds
    );
    expect(result).toEqual([
      '^FO50,100',
      '^A0N,30,25',
      '^FDHello^FS',
    ]);
  });

  it('generates text with rotation', () => {
    const result = generateTextZpl(
      { content: 'Test', font: 'A', fontSize: 20, fontWidth: 15, rotation: 90 },
      bounds
    );
    expect(result).toContain('^AAR,20,15');
  });

  it('generates text with field block', () => {
    const result = generateTextZpl(
      {
        content: 'Line 1\nLine 2',
        font: '0',
        fontSize: 30,
        fontWidth: 25,
        rotation: 0,
        fieldBlock: { maxLines: 3, lineSpacing: 0, justification: 'L' },
      },
      bounds
    );
    expect(result).toContain('^FB200,3,0,L,0');
    expect(result).toContain('^FDLine 1\\&Line 2^FS');
  });

  it('does not add ^FB without fieldBlock', () => {
    const result = generateTextZpl(
      { content: 'Simple', font: '0', fontSize: 30, fontWidth: 25, rotation: 0 },
      bounds
    );
    expect(result.join('')).not.toContain('^FB');
  });
});

describe('barcodeCommand', () => {
  it('generates Code 128 barcode', () => {
    const result = barcodeCommand(
      { content: '12345', encoding: 'code128', height: 80, showText: true, rotation: 0 },
      bounds
    );
    expect(result).toEqual([
      '^FO50,100',
      '^BCN,80,Y,N',
      '^FD12345^FS',
    ]);
  });

  it('generates Code 39 barcode', () => {
    const result = barcodeCommand(
      { content: 'ABC', encoding: 'code39', height: 60, showText: false, rotation: 0 },
      bounds
    );
    expect(result).toContain('^B3N,N,60,N,N');
  });

  it('generates EAN-13 barcode', () => {
    const result = barcodeCommand(
      { content: '1234567890128', encoding: 'ean13', height: 100, showText: true, rotation: 0 },
      bounds
    );
    expect(result).toContain('^BEN,100,Y,N');
  });

  it('generates UPC-A barcode', () => {
    const result = barcodeCommand(
      { content: '012345678905', encoding: 'upca', height: 100, showText: true, rotation: 0 },
      bounds
    );
    expect(result).toContain('^BUN,100,Y,N');
  });

  it('generates ITF barcode', () => {
    const result = barcodeCommand(
      { content: '1234', encoding: 'itf', height: 70, showText: true, rotation: 0 },
      bounds
    );
    expect(result).toContain('^B2N,70,Y,N');
  });

  it('handles rotation', () => {
    const result = barcodeCommand(
      { content: '12345', encoding: 'code128', height: 80, showText: true, rotation: 270 },
      bounds
    );
    expect(result).toContain('^BCB,80,Y,N');
  });

  it('handles showText=false', () => {
    const result = barcodeCommand(
      { content: '12345', encoding: 'code128', height: 80, showText: false, rotation: 0 },
      bounds
    );
    expect(result).toContain('^BCN,80,N,N');
  });
});

describe('qrcodeCommand', () => {
  it('generates QR code', () => {
    const result = qrcodeCommand(
      { content: 'https://example.com', magnification: 5, errorCorrection: 'M' },
      bounds
    );
    expect(result).toEqual([
      '^FO50,100',
      '^BQN,2,5',
      '^FDMA,https://example.com^FS',
    ]);
  });

  it('handles different error correction levels', () => {
    const result = qrcodeCommand(
      { content: 'data', magnification: 3, errorCorrection: 'H' },
      bounds
    );
    expect(result).toContain('^FDHA,data^FS');
  });
});

describe('rectangleZpl', () => {
  it('generates bordered rectangle', () => {
    const result = rectangleZpl(
      { borderThickness: 3, cornerRadius: 0, filled: false },
      bounds
    );
    expect(result).toEqual([
      '^FO50,100',
      '^GB200,80,3,B,0^FS',
    ]);
  });

  it('generates filled rectangle with min dimension as thickness', () => {
    const result = rectangleZpl(
      { borderThickness: 3, cornerRadius: 0, filled: true },
      bounds
    );
    // filled: thickness = min(200, 80) = 80
    expect(result).toContain('^GB200,80,80,B,0^FS');
  });

  it('applies corner radius', () => {
    const result = rectangleZpl(
      { borderThickness: 2, cornerRadius: 8, filled: false },
      bounds
    );
    expect(result).toContain('^GB200,80,2,B,8^FS');
  });
});

describe('lineZpl', () => {
  it('generates horizontal line', () => {
    const result = lineZpl(
      { thickness: 3, orientation: 'horizontal' },
      bounds
    );
    expect(result).toEqual([
      '^FO50,100',
      '^GB200,3,3^FS',
    ]);
  });

  it('generates vertical line', () => {
    const result = lineZpl(
      { thickness: 3, orientation: 'vertical' },
      bounds
    );
    expect(result).toEqual([
      '^FO50,100',
      '^GB3,80,3^FS',
    ]);
  });
});

describe('containerZpl', () => {
  it('returns empty array (containers have no visual output)', () => {
    expect(containerZpl({}, bounds)).toEqual([]);
  });
});

describe('imageZpl', () => {
  it('returns empty array when no image data', () => {
    const result = imageZpl(
      {
        data: '',
        originalWidth: 100,
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
      },
      bounds
    );
    expect(result).toEqual([]);
  });

  it('generates ^GFA command when image data is present', () => {
    const result = imageZpl(
      {
        data: 'data:image/png;base64,abc',
        originalWidth: 8,
        originalHeight: 2,
        threshold: 128,
        invert: false,
        monochromeMethod: 'threshold',
        monochromePreview: '',
        monochromePreviewFull: '',
        zplHex: 'FF00',
        zplBytesPerRow: 1,
        zplWidth: 8,
        zplHeight: 2,
      },
      bounds
    );
    expect(result).toEqual(['^FO50,100', '^GFA,2,2,1,FF00', '^FS']);
  });
});
