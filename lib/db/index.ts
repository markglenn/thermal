import path from 'path';
import type { LabelDocument } from '../types';

const DATABASE_URL = process.env.DATABASE_URL || 'file:./thermal.db';
const isPostgres = DATABASE_URL.startsWith('postgres');

// Lazy-initialized singletons
let _db: unknown;
let _tables: { labels: unknown; labelVersions: unknown };

function getDb() {
  if (_db) return { db: _db, tables: _tables };

  if (isPostgres) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/node-postgres');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const schema = require('./schema-pg');
    const pool = new Pool({ connectionString: DATABASE_URL });
    _db = drizzle(pool, { schema });
    _tables = { labels: schema.labels, labelVersions: schema.labelVersions };
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require('drizzle-orm/better-sqlite3');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const schema = require('./schema-sqlite');
    const dbPath = DATABASE_URL.replace(/^file:/, '');
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle/sqlite') });
    _db = db;
    _tables = { labels: schema.labels, labelVersions: schema.labelVersions };
  }

  return { db: _db, tables: _tables };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbInstance = { db: any; tables: { labels: any; labelVersions: any } };

// Re-export typed accessors
export function getDatabase(): DbInstance {
  return getDb() as DbInstance;
}

/** Reset singleton — for tests only */
export function resetDatabase() {
  _db = undefined as unknown;
  _tables = undefined as unknown as typeof _tables;
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
