import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    // Integration tests hit real local services (ElasticMQ, Postgres) and
    // are excluded from the default `npm test` run. Invoke them
    // explicitly via `npm run test:integration`.
    //
    // `.next/**` is excluded because Next.js caches dependency trees
    // there (including pino's own internal test suite), which would
    // otherwise get swept into the run.
    exclude: ['node_modules', '.next', 'e2e', 'tests/integration/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
