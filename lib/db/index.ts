import path from 'path';
import type { LabelDocument } from '../types';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as sqliteSchema from './schema-sqlite';

// Use the SQLite schema types as the canonical table type — both dialects have
// identical column names so queries written against these types work for either.
type Schema = typeof sqliteSchema;
type Tables = { labels: Schema['labels']; labelVersions: Schema['labelVersions'] };
type Db = BetterSQLite3Database<Schema>;

const DATABASE_URL = process.env.DATABASE_URL || 'file:./thermal.db';
const isPostgres = DATABASE_URL.startsWith('postgres');

// Lazy-initialized singletons
let _db: Db | undefined;
let _tables: Tables | undefined;

function getDb(): { db: Db; tables: Tables } {
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
    _tables = { labels: schema.labels, labelVersions: schema.labelVersions };
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/better-sqlite3');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const schema = require('./schema-sqlite') as Schema;
    const dbPath = DATABASE_URL.replace(/^file:/, '');
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite, { schema }) as Db;
    migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle/sqlite') });
    _db = db;
    _tables = { labels: schema.labels, labelVersions: schema.labelVersions };
  }

  return { db: _db!, tables: _tables! };
}

export function getDatabase(): { db: Db; tables: Tables } {
  return getDb();
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
  status: 'draft' | 'production';
  document: LabelDocument;
  thumbnail: Buffer | string | null;
  createdAt: Date;
};
