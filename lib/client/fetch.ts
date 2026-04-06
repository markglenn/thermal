import { toast } from '@/lib/toast-store';

/**
 * Parse an error body from an API response, falling back to a generic message.
 */
async function parseErrorBody(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // Not JSON — fall through
  }
  return `Request failed (${res.status})`;
}

/**
 * Typed fetch helper for JSON API routes. On success, parses and returns the JSON body.
 * On failure, shows a toast with the error message and returns null.
 *
 * Usage:
 *   const data = await fetchJson<MyType>('/api/labels');
 *   if (!data) return; // error already toasted
 */
export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
  opts?: { silent?: boolean }
): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    if (!opts?.silent) toast('Network error. Check your connection.', 'error');
    return null;
  }

  if (!res.ok) {
    if (!opts?.silent) {
      const message = await parseErrorBody(res);
      toast(message, 'error');
    }
    return null;
  }

  try {
    return await res.json() as T;
  } catch {
    if (!opts?.silent) toast('Invalid response from server.', 'error');
    return null;
  }
}

/**
 * Fire-and-forget fetch for non-critical requests (e.g. thumbnail updates).
 * Logs errors to console but does not toast.
 */
export function fetchQuiet(url: string, init?: RequestInit): void {
  fetch(url, init).catch((e) => {
    console.error(`Background fetch failed: ${url}`, e);
  });
}
