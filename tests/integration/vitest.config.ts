import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Config for integration tests. Mirrors the root alias setup but scopes
 * vitest to `tests/integration/**` and wires in the env-loading setup
 * file so .env.local values are available without manual prefixing.
 */
export default defineConfig({
  test: {
    globals: true,
    include: ['tests/integration/**/*.int.test.ts'],
    setupFiles: ['tests/integration/setup.ts'],
    // Integration tests mutate the shared dev DB and ElasticMQ; run
    // them serially to keep jobId/queue state predictable.
    fileParallelism: false,
    // Give the end-to-end flow a generous ceiling — creating and
    // tearing down queues, plus a real DB round-trip, is slower than
    // the millisecond-grained unit suite.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../..'),
    },
  },
});
