import { gzipSync } from 'zlib';

/**
 * Gzip-compress a string. Returns a Buffer of the compressed bytes.
 * The print server must gunzip to recover the original content.
 */
export function compressData(data: string): Buffer {
  return gzipSync(Buffer.from(data, 'utf-8'));
}
