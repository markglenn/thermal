import path from 'path';
import type { LabelDocument } from '../types';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as sqliteSchema from './schema-sqlite';

// Use the SQLite schema types as the canonical table type — both dialects have
// identical column names so queries written against these types work for either.
type Schema = typeof sqliteSchema;
type Tables = { labels: Schema['labels']; labelVersions: Schema['labelVersions']; labelSizes: Schema['labelSizes'] };

// LibSQLDatabase is the canonical DB type. Both libsql (dev) and node-postgres
// (prod) expose an async API, so the runtime contract is the same. The Postgres
// drizzle instance is cast to this type — a safe cast since both return promises
// from select/insert/update/delete/transaction.
type Db = LibSQLDatabase<Schema>;

const DATABASE_URL = process.env.DATABASE_URL || 'file:./thermal.db';
const isPostgres = DATABASE_URL.startsWith('postgres');

// Lazy-initialized singletons
let _db: Db | undefined;
let _tables: Tables | undefined;

async function initDb(): Promise<{ db: Db; tables: Tables }> {
  if (_db && _tables) return { db: _db, tables: _tables };

  if (isPostgres) {
    // Dynamic import — pg is only installed in prod environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/node-postgres');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const schema = require('./schema-pg');
    const pool = new Pool({ connectionString: DATABASE_URL });
    _db = drizzle(pool, { schema }) as Db;
    _tables = { labels: schema.labels, labelVersions: schema.labelVersions, labelSizes: schema.labelSizes };
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/libsql');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { migrate } = require('drizzle-orm/libsql/migrator');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const schema = require('./schema-sqlite') as Schema;
    const client = createClient({ url: DATABASE_URL });
    const db = drizzle(client, { schema }) as Db;
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle/sqlite') });
    _db = db;
    _tables = { labels: schema.labels, labelVersions: schema.labelVersions, labelSizes: schema.labelSizes };
  }

  return { db: _db!, tables: _tables! };
}

export async function getDatabase(): Promise<{ db: Db; tables: Tables }> {
  return initDb();
}

/** Reset singleton — for tests only */
export function resetDatabase() {
  _db = undefined;
  _tables = undefined;
}

export type LabelRow = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LabelVersionRow = {
  id: string;
  labelId: string;
  version: number;
  status: 'production' | null;
  document: LabelDocument;
  thumbnail: ArrayBuffer | string | null;
  archivedAt: Date | null;
  createdAt: Date;
};

/** Parse a base64 data URI thumbnail into a Buffer for DB storage. */
export function parseThumbnail(thumbnail: string | undefined): Buffer | null {
  if (!thumbnail) return null;
  const base64 = thumbnail.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}
