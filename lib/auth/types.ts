import type { Role } from './roles';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      sub: string;
      role: Role;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    sub: string;
    role: Role;
  }
}
