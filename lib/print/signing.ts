import { createHmac } from 'crypto';

function getSecret(): string {
  const secret = process.env.PRINT_SIGNING_SECRET;
  if (!secret) throw new Error('PRINT_SIGNING_SECRET environment variable is not set');
  return secret;
}

/** Sign a print job message. The payload is either an S3 key or inline ZPL data. */
export function signJob(jobId: string, payload: string): string {
  return createHmac('sha256', getSecret())
    .update(jobId)
    .update(payload)
    .digest('hex');
}

/** Verify a print job message signature. */
export function verifyJob(jobId: string, payload: string, signature: string): boolean {
  const expected = signJob(jobId, payload);
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}
