import { createHmac } from 'crypto';

function getSecret(): string {
  const secret = process.env.PRINT_SIGNING_SECRET;
  if (!secret) throw new Error('PRINT_SIGNING_SECRET environment variable is not set');
  return secret;
}

/** Sign a print job chunk. Returns a hex-encoded HMAC-SHA256 signature. */
export function signChunk(jobId: string, chunkIndex: number, zpl: string): string {
  return createHmac('sha256', getSecret())
    .update(jobId)
    .update(String(chunkIndex))
    .update(zpl)
    .digest('hex');
}

/** Verify a print job chunk signature. */
export function verifyChunk(jobId: string, chunkIndex: number, zpl: string, signature: string): boolean {
  const expected = signChunk(jobId, chunkIndex, zpl);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
