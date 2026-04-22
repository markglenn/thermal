import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_PREFIX = 'thrml_';
const PREFIX_BYTES = 6;   // 12 hex chars — displayed to admins for identification
const SECRET_BYTES = 24;  // 48 hex chars — the random secret portion
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SALT_BYTES = 16;

export interface GeneratedApiKey {
  /** The full key string to show to the admin once. Never stored. */
  raw: string;
  /** Identifier segment shown in lists so admins can correlate a key with its row. */
  prefix: string;
  /** Storable hash. `scrypt:{salt-hex}:{hash-hex}`. */
  hash: string;
}

export function generateApiKey(): GeneratedApiKey {
  const prefix = randomBytes(PREFIX_BYTES).toString('hex');
  const secret = randomBytes(SECRET_BYTES).toString('hex');
  const raw = `${KEY_PREFIX}${prefix}_${secret}`;
  return { raw, prefix, hash: hashApiKey(raw) };
}

function hashApiKey(raw: string): string {
  const salt = randomBytes(SALT_BYTES);
  const derived = scryptSync(raw, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

export function verifyApiKey(raw: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (salt.length !== SALT_BYTES || expected.length !== SCRYPT_KEYLEN) return false;

  let derived: Buffer;
  try {
    derived = scryptSync(raw, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  } catch {
    return false;
  }
  return timingSafeEqual(derived, expected);
}

/**
 * Pull a bearer token out of an Authorization header. Returns null for
 * anything that isn't a well-formed Thermal API key so we don't spend
 * scrypt cycles on obvious junk.
 */
export function parseBearerApiKey(headerValue: string | null): { prefix: string; raw: string } | null {
  if (!headerValue) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(headerValue);
  if (!match) return null;
  const raw = match[1];
  if (!raw.startsWith(KEY_PREFIX)) return null;
  const body = raw.slice(KEY_PREFIX.length);
  const sep = body.indexOf('_');
  if (sep !== PREFIX_BYTES * 2) return null;
  const prefix = body.slice(0, sep);
  const secret = body.slice(sep + 1);
  if (!/^[0-9a-f]+$/.test(prefix) || !/^[0-9a-f]+$/.test(secret)) return null;
  if (secret.length !== SECRET_BYTES * 2) return null;
  return { prefix, raw };
}
