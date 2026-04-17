/**
 * Integration test setup:
 * - Load env vars from .env.local (same approach as scripts/env.ts)
 * - Redirect DATABASE_URL to the test DB (thermal_test) so tests never
 *   touch the dev DB, matching how unit tests behave via
 *   lib/db/migrate-test.ts
 */

import '../../scripts/env';

const devUrl = process.env.DATABASE_URL;
if (devUrl && devUrl.endsWith('/thermal')) {
  process.env.DATABASE_URL = devUrl.replace(/\/thermal$/, '/thermal_test');
}
