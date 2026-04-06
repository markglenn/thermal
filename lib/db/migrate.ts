/**
 * Explicit migration runner. Run this during deployment or dev startup,
 * NOT during request handling.
 *
 * Usage:
 *   npx tsx lib/db/migrate.ts
 *
 * In dev, this is invoked automatically by the `dev` script.
 * In prod (Postgres), run before starting the server.
 */

import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'file:./thermal.db';
const isPostgres = DATABASE_URL.startsWith('postgres');

export async function runMigrations(): Promise<void> {
  if (isPostgres) {
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DATABASE_URL });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle/pg') });
    await pool.end();
  } else {
    const { createClient } = await import('@libsql/client');
    const { drizzle } = await import('drizzle-orm/libsql');
    const { migrate } = await import('drizzle-orm/libsql/migrator');
    const client = createClient({ url: DATABASE_URL });
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle/sqlite') });
  }
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
