import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema-sqlite.ts',
  out: './drizzle/sqlite',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL?.replace(/^file:/, '') || './thermal.db',
  },
});
