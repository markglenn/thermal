import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateApiKey } from './api-keys';

// ---- Mocks -----------------------------------------------------------------

const mockAuth = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
vi.mock('@/lib/db', () => ({
  getDatabase: async () => ({
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => mockSelect(),
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: () => mockUpdate(),
        }),
      }),
    },
    tables: { apiKeys: 'apiKeys' },
  }),
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// Import after mocks are installed.
import { requireRole, isAuthError } from './require-role';

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/test', { headers });
}

beforeEach(() => {
  mockAuth.mockReset();
  mockSelect.mockReset();
  mockUpdate.mockReset().mockResolvedValue(undefined);
});

describe('requireRole', () => {
  describe('session-cookie path', () => {
    it('returns 401 when no session and no bearer', async () => {
      mockAuth.mockResolvedValue(null);
      const result = await requireRole('viewer', makeRequest());
      expect(isAuthError(result)).toBe(true);
      if (isAuthError(result)) expect(result.status).toBe(401);
    });

    it('returns 403 when session role is below required', async () => {
      mockAuth.mockResolvedValue({ user: { sub: 'u1', role: 'viewer' } });
      const result = await requireRole('admin', makeRequest());
      expect(isAuthError(result)).toBe(true);
      if (isAuthError(result)) expect(result.status).toBe(403);
    });

    it('returns the session when role meets the requirement', async () => {
      mockAuth.mockResolvedValue({ user: { sub: 'u1', role: 'admin' } });
      const result = await requireRole('editor', makeRequest());
      expect(isAuthError(result)).toBe(false);
      if (!isAuthError(result)) expect(result.user.role).toBe('admin');
    });
  });

  describe('bearer-token path', () => {
    it('synthesizes a session from a valid, non-revoked key', async () => {
      const { raw, prefix, hash } = generateApiKey();
      mockSelect.mockResolvedValue([{
        id: 'key-1', name: 'test', prefix, keyHash: hash,
        role: 'editor', revokedAt: null,
      }]);

      const result = await requireRole('editor', makeRequest({
        authorization: `Bearer ${raw}`,
      }));

      expect(isAuthError(result)).toBe(false);
      if (!isAuthError(result)) {
        expect(result.user.sub).toBe('apikey:key-1');
        expect(result.user.role).toBe('editor');
      }
      expect(mockAuth).not.toHaveBeenCalled(); // never fell through to session
    });

    it('returns 403 when key role is below required', async () => {
      const { raw, prefix, hash } = generateApiKey();
      mockSelect.mockResolvedValue([{
        id: 'key-2', name: 'viewer-only', prefix, keyHash: hash,
        role: 'viewer', revokedAt: null,
      }]);

      const result = await requireRole('admin', makeRequest({
        authorization: `Bearer ${raw}`,
      }));

      expect(isAuthError(result)).toBe(true);
      if (isAuthError(result)) expect(result.status).toBe(403);
      expect(mockAuth).not.toHaveBeenCalled(); // bearer matched — don't fall through
    });

    it('falls through to session auth when key prefix is not found', async () => {
      const { raw } = generateApiKey();
      mockSelect.mockResolvedValue([]); // no row for this prefix
      mockAuth.mockResolvedValue({ user: { sub: 'cookie-user', role: 'admin' } });

      const result = await requireRole('admin', makeRequest({
        authorization: `Bearer ${raw}`,
      }));

      expect(isAuthError(result)).toBe(false);
      if (!isAuthError(result)) expect(result.user.sub).toBe('cookie-user');
    });

    it('falls through to session auth when key is revoked', async () => {
      const { raw, prefix, hash } = generateApiKey();
      mockSelect.mockResolvedValue([{
        id: 'key-3', name: 'revoked', prefix, keyHash: hash,
        role: 'admin', revokedAt: new Date(),
      }]);
      mockAuth.mockResolvedValue(null);

      const result = await requireRole('viewer', makeRequest({
        authorization: `Bearer ${raw}`,
      }));

      expect(isAuthError(result)).toBe(true);
      if (isAuthError(result)) expect(result.status).toBe(401);
    });

    it('falls through to session auth when the secret doesn\'t match the stored hash', async () => {
      const legit = generateApiKey();
      const imposter = generateApiKey();
      // Same prefix collision is implausible in practice but simulates a
      // forged bearer: right prefix shape, wrong secret.
      mockSelect.mockResolvedValue([{
        id: 'key-4', name: 'legit', prefix: legit.prefix, keyHash: legit.hash,
        role: 'admin', revokedAt: null,
      }]);
      mockAuth.mockResolvedValue(null);

      // Swap the secret portion — prefix matches, but scrypt won't verify.
      const forged = `thrml_${legit.prefix}_${imposter.raw.split('_')[2]}`;
      const result = await requireRole('viewer', makeRequest({
        authorization: `Bearer ${forged}`,
      }));

      expect(isAuthError(result)).toBe(true);
    });

    it('ignores non-Thermal Authorization headers without touching the DB', async () => {
      mockAuth.mockResolvedValue({ user: { sub: 'cookie-user', role: 'viewer' } });

      const result = await requireRole('viewer', makeRequest({
        authorization: 'Bearer github_pat_xxx',
      }));

      expect(isAuthError(result)).toBe(false);
      expect(mockSelect).not.toHaveBeenCalled();
    });
  });

  describe('service role', () => {
    it('a service-role key can hit a service-gated endpoint', async () => {
      const { raw, prefix, hash } = generateApiKey();
      mockSelect.mockResolvedValue([{
        id: 'key-s', name: 'print-only', prefix, keyHash: hash,
        role: 'service', revokedAt: null,
      }]);

      const result = await requireRole('service', makeRequest({
        authorization: `Bearer ${raw}`,
      }));

      expect(isAuthError(result)).toBe(false);
      if (!isAuthError(result)) expect(result.user.role).toBe('service');
    });

    it('a service-role key is blocked from an editor-gated endpoint', async () => {
      const { raw, prefix, hash } = generateApiKey();
      mockSelect.mockResolvedValue([{
        id: 'key-s2', name: 'print-only', prefix, keyHash: hash,
        role: 'service', revokedAt: null,
      }]);

      const result = await requireRole('editor', makeRequest({
        authorization: `Bearer ${raw}`,
      }));

      expect(isAuthError(result)).toBe(true);
      if (isAuthError(result)) expect(result.status).toBe(403);
    });
  });

  it('skips the bearer check entirely when no request is passed', async () => {
    mockAuth.mockResolvedValue({ user: { sub: 'cookie-user', role: 'editor' } });
    const result = await requireRole('viewer');
    expect(isAuthError(result)).toBe(false);
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
