import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import type { LabelDocument } from '../types';

type Tables = {
  labels: typeof schema.labels;
  labelVersions: typeof schema.labelVersions;
  labelSizes: typeof schema.labelSizes;
  variableBanks: typeof schema.variableBanks;
  printJobs: typeof schema.printJobs;
};

type Db = NodePgDatabase<typeof schema>;

const DATABASE_URL = process.env.DATABASE_URL;

let _db: Db | undefined;
let _tables: Tables | undefined;

async function initDb(): Promise<{ db: Db; tables: Tables }> {
  if (_db && _tables) return { db: _db, tables: _tables };

  if (!DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Add a postgres:// connection string to .env.local'
    );
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  _db = drizzle(pool, { schema });
  _tables = {
    labels: schema.labels,
    labelVersions: schema.labelVersions,
    labelSizes: schema.labelSizes,
    variableBanks: schema.variableBanks,
    printJobs: schema.printJobs,
  };

  // Verify the expected tables exist — fails fast if migrations haven't been run
  try {
    await _db.select().from(_tables.labels).limit(0);
  } catch (e) {
    throw new Error(
      `Database tables not found. Run migrations first: npm run db:migrate\n${e instanceof Error ? e.message : e}`
    );
  }

  return { db: _db, tables: _tables };
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
  archivedAt: Date | null;
};

export type LabelVersionRow = {
  id: string;
  labelId: string;
  version: number;
  status: 'published' | null;
  document: LabelDocument;
  thumbnail: Buffer | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
};

/** Parse a base64 data URI thumbnail into a Buffer for DB storage. */
export function parseThumbnail(thumbnail: string | undefined): Buffer | null {
  if (!thumbnail) return null;
  const base64 = thumbnail.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}
