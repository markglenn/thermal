import NextAuth from 'next-auth';
import type { NextAuthConfig, Session } from 'next-auth';
import { resolveRole } from './roles';
import type { Role } from './roles';
import './types';

/** True when Okta env vars are configured. */
export const authEnabled =
  !!process.env.AUTH_OKTA_ISSUER &&
  !!process.env.AUTH_OKTA_ID &&
  !!process.env.AUTH_OKTA_SECRET;

const authConfig: NextAuthConfig = {
  providers: authEnabled
    ? [
        {
          id: 'okta',
          name: 'Okta',
          type: 'oidc',
          issuer: process.env.AUTH_OKTA_ISSUER,
          clientId: process.env.AUTH_OKTA_ID,
          clientSecret: process.env.AUTH_OKTA_SECRET,
          authorization: { params: { scope: 'openid email profile groups' } },
        },
      ]
    : [],
  callbacks: {
    jwt({ token, profile }) {
      if (profile) {
        token.sub = profile.sub!;
        token.role = resolveRole(
          Array.isArray(profile.groups) ? (profile.groups as string[]) : []
        );
      }
      return token;
    },
    session({ session, token }) {
      session.user.sub = token.sub as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

const nextAuth = NextAuth(authConfig);

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

/** Dev-mode session stub used when auth is not configured. */
const DEV_SESSION: Session = {
  user: { sub: 'dev', email: 'dev@localhost', name: 'Dev User', role: 'admin' as Role },
  expires: new Date(Date.now() + 86400_000).toISOString(),
};

/**
 * Returns the session, or a dev-mode stub when auth is not configured.
 */
export async function auth(): Promise<Session | null> {
  if (!authEnabled) return DEV_SESSION;
  return nextAuth.auth();
}

/**
 * NextAuth middleware — used by middleware.ts when auth is enabled.
 * When auth is disabled, middleware.ts skips this entirely.
 */
export const authMiddleware = nextAuth.auth;

export { hasRole, resolveRole, type Role, ROLES } from './roles';
