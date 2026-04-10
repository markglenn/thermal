import { describe, it, expect } from 'vitest';
import { gunzipSync } from 'zlib';
import { compressData } from './compress';

describe('compressData', () => {
  it('produces valid gzipped data that decompresses to the original', () => {
    const zpl = '^XA\n^PW812\n^LL812\n^FO10,10\n^FDHello World^FS\n^XZ';
    const compressed = compressData(zpl);
    expect(Buffer.isBuffer(compressed)).toBe(true);
    const decompressed = gunzipSync(compressed).toString('utf-8');
    expect(decompressed).toBe(zpl);
  });

  it('significantly reduces size for GFA hex data', () => {
    const hexData = '0'.repeat(5000) + 'FF'.repeat(500);
    const zpl = `^XA\n^GFA,3000,3000,38,${hexData}\n^XZ`;
    const originalSize = Buffer.byteLength(zpl, 'utf-8');
    const compressed = compressData(zpl);
    expect(compressed.length).toBeLessThan(originalSize * 0.5);
  });

  it('handles empty input', () => {
    const compressed = compressData('');
    const decompressed = gunzipSync(compressed).toString('utf-8');
    expect(decompressed).toBe('');
  });
});
