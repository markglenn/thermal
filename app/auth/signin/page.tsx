import { signIn } from '@/lib/auth';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <form
        action={async () => {
          'use server';
          await signIn('okta', { redirectTo: '/' });
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-white px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
        >
          Sign in with Okta
        </button>
      </form>
    </div>
  );
}
