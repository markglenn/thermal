import { gzipSync } from 'zlib';

/**
 * Gzip-compress a ZPL string and return it as a base64 string.
 * The print server must base64-decode then gunzip to recover the original ZPL.
 */
export function compressZpl(zpl: string): string {
  const compressed = gzipSync(Buffer.from(zpl, 'utf-8'));
  return compressed.toString('base64');
}

/** Returns the byte length of a base64-encoded gzipped version of the input. */
export function compressedByteLength(zpl: string): number {
  return Buffer.byteLength(compressZpl(zpl), 'utf-8');
}
