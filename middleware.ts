import { NextResponse } from 'next/server';
import { authEnabled, authMiddleware } from '@/lib/auth';

// When auth is enabled, use NextAuth's middleware to enforce authentication.
// When auth is not configured (dev without Okta), pass through all requests.
export default authEnabled
  ? authMiddleware
  : () => NextResponse.next();

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
