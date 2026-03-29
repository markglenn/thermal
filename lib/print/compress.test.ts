import { describe, it, expect } from 'vitest';
import { gunzipSync } from 'zlib';
import { compressZpl, compressedByteLength } from './compress';

describe('compressZpl', () => {
  it('produces valid gzipped base64 that decompresses to the original', () => {
    const zpl = '^XA\n^PW812\n^LL812\n^FO10,10\n^FDHello World^FS\n^XZ';
    const compressed = compressZpl(zpl);
    const decompressed = gunzipSync(Buffer.from(compressed, 'base64')).toString('utf-8');
    expect(decompressed).toBe(zpl);
  });

  it('significantly reduces size for GFA hex data', () => {
    const hexData = '0'.repeat(5000) + 'FF'.repeat(500);
    const zpl = `^XA\n^GFA,3000,3000,38,${hexData}\n^XZ`;
    const originalSize = Buffer.byteLength(zpl, 'utf-8');
    const compressedSize = compressedByteLength(zpl);
    expect(compressedSize).toBeLessThan(originalSize * 0.5);
  });

  it('handles empty ZPL', () => {
    const compressed = compressZpl('');
    const decompressed = gunzipSync(Buffer.from(compressed, 'base64')).toString('utf-8');
    expect(decompressed).toBe('');
  });
});
