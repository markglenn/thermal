import { gzipSync } from 'zlib';

/**
 * Gzip-compress a ZPL string. Returns a Buffer of the compressed bytes.
 * The print server must gunzip to recover the original ZPL.
 */
export function compressZpl(zpl: string): Buffer {
  return gzipSync(Buffer.from(zpl, 'utf-8'));
}
