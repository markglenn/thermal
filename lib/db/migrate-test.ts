/**
 * Migrate the test database before running tests.
 * Derives the test DB URL from DATABASE_URL by replacing the database name.
 */

import path from 'path';
import '../../scripts/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const devUrl = process.env.DATABASE_URL;
if (!devUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const testUrl = devUrl.replace(/\/thermal$/, '/thermal_test');

const pool = new Pool({ connectionString: testUrl });

migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), 'drizzle') })
  .then(() => {
    console.log('Test database migrations complete.');
    return pool.end();
  })
  .catch((err) => {
    console.error('Test database migration failed:', err);
    process.exit(1);
  });
