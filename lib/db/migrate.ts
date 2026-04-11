/**
 * Explicit migration runner. Run this during deployment or dev startup,
 * NOT during request handling.
 *
 * Usage:
 *   npx tsx lib/db/migrate.ts
 *
 * In dev, this is invoked automatically by the `dev` script.
 * In prod, run before starting the server.
 */

import path from 'path';
import '../../scripts/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

export async function runMigrations(): Promise<void> {
  if (!DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Add a postgres:// connection string to .env.local'
    );
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  await pool.end();
}

// Run directly when invoked as a script
if (require.main === module || process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => {
      console.log('Migrations complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
