'use client';

import { useSession as useNextAuthSession } from 'next-auth/react';
import type { Role } from './roles';

export function useRole(): Role {
  const { data: session } = useNextAuthSession();
  return (session?.user as { role?: Role } | undefined)?.role ?? 'editor';
}

export { useNextAuthSession as useSession };
