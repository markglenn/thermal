import { describe, it, expect } from 'vitest';
import { generateApiKey, verifyApiKey, parseBearerApiKey } from './api-keys';

describe('api-keys', () => {
  describe('generateApiKey', () => {
    it('produces a roundtrippable key that verifies against its hash', () => {
      const { raw, hash } = generateApiKey();
      expect(verifyApiKey(raw, hash)).toBe(true);
    });

    it('produces distinct keys on each call', () => {
      const a = generateApiKey();
      const b = generateApiKey();
      expect(a.raw).not.toBe(b.raw);
      expect(a.prefix).not.toBe(b.prefix);
      expect(a.hash).not.toBe(b.hash);
    });

    it('emits a prefix whose hex length matches the stored prefix field', () => {
      const { raw, prefix } = generateApiKey();
      expect(raw.startsWith(`thrml_${prefix}_`)).toBe(true);
      expect(/^[0-9a-f]+$/.test(prefix)).toBe(true);
    });

    it('uses scrypt and a fresh salt per call — same input, different salt, different hash', () => {
      const a = generateApiKey();
      const b = generateApiKey();
      const [, saltA] = a.hash.split(':');
      const [, saltB] = b.hash.split(':');
      expect(saltA).not.toBe(saltB);
    });
  });

  describe('verifyApiKey', () => {
    it('rejects the wrong key', () => {
      const a = generateApiKey();
      const b = generateApiKey();
      expect(verifyApiKey(b.raw, a.hash)).toBe(false);
    });

    it('rejects a malformed hash', () => {
      const { raw } = generateApiKey();
      expect(verifyApiKey(raw, 'not-a-valid-hash')).toBe(false);
      expect(verifyApiKey(raw, 'scrypt:xx:yy')).toBe(false);
      expect(verifyApiKey(raw, 'bcrypt:deadbeef:cafebabe')).toBe(false);
    });

    it('rejects an empty string', () => {
      const { hash } = generateApiKey();
      expect(verifyApiKey('', hash)).toBe(false);
    });
  });

  describe('parseBearerApiKey', () => {
    it('parses a well-formed header', () => {
      const { raw, prefix } = generateApiKey();
      const parsed = parseBearerApiKey(`Bearer ${raw}`);
      expect(parsed).not.toBeNull();
      expect(parsed?.prefix).toBe(prefix);
      expect(parsed?.raw).toBe(raw);
    });

    it('is case-insensitive on the Bearer scheme', () => {
      const { raw } = generateApiKey();
      expect(parseBearerApiKey(`bearer ${raw}`)).not.toBeNull();
      expect(parseBearerApiKey(`BEARER ${raw}`)).not.toBeNull();
    });

    it('returns null for junk — no scrypt cycles spent on obvious misses', () => {
      expect(parseBearerApiKey(null)).toBeNull();
      expect(parseBearerApiKey('')).toBeNull();
      expect(parseBearerApiKey('Basic xyz')).toBeNull();
      expect(parseBearerApiKey('Bearer not-a-thermal-key')).toBeNull();
      expect(parseBearerApiKey('Bearer thrml_nope')).toBeNull();
      expect(parseBearerApiKey('Bearer thrml_XYZ_aaa')).toBeNull(); // non-hex prefix
      expect(parseBearerApiKey('Bearer thrml_deadbeef1234_short')).toBeNull();
    });
  });
});
