import { convertImageUrlToMonochrome } from '@/lib/components/image/convert-server';
import type { MonochromeResult } from '@/lib/components/image/monochrome';

type Method = 'threshold' | 'dither' | 'ordered';

export interface BatchImageLoader {
  convert(
    url: string,
    width: number,
    height: number,
    threshold: number,
    invert: boolean,
    method: Method,
  ): Promise<MonochromeResult>;
}

/**
 * Create a per-print-job image loader that dedupes identical conversions
 * (same URL + same conversion params) and caps concurrent fetch/convert
 * operations. Without this, generating N labels with field-bound images
 * would fire N concurrent fetches — blowing up image servers, Node's
 * socket pool, and memory.
 *
 * Dedupe is promise-based: if two rows request the same URL while the
 * first is still in flight, both await the same promise.
 */
export function createBatchImageLoader(concurrency = 8): BatchImageLoader {
  const cache = new Map<string, Promise<MonochromeResult>>();
  let running = 0;
  const queue: Array<() => void> = [];

  const runNext = () => {
    if (running >= concurrency) return;
    const task = queue.shift();
    if (!task) return;
    running++;
    task();
  };

  const limit = <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      const run = async () => {
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        } finally {
          running--;
          runNext();
        }
      };
      queue.push(run);
      runNext();
    });

  return {
    convert(url, width, height, threshold, invert, method) {
      const key = `${url}|${width}x${height}|${threshold}|${invert ? 1 : 0}|${method}`;
      const existing = cache.get(key);
      if (existing) return existing;
      const promise = limit(() =>
        convertImageUrlToMonochrome(url, width, height, threshold, invert, method),
      );
      cache.set(key, promise);
      return promise;
    },
  };
}
