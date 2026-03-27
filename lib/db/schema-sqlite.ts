import { sqliteTable, text, integer, real, blob, unique } from 'drizzle-orm/sqlite-core';

export const labelSizes = sqliteTable('label_sizes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  widthInches: real('width_inches').notNull(),
  heightInches: real('height_inches').notNull(),
  dpi: integer('dpi').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const labels = sqliteTable('labels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
});

export const labelVersions = sqliteTable(
  'label_versions',
  {
    id: text('id').primaryKey(),
    labelId: text('label_id')
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: text('status'),
    archivedAt: integer('archived_at', { mode: 'timestamp' }),
    document: text('document', { mode: 'json' }).notNull(),
    thumbnail: blob('thumbnail', { mode: 'buffer' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [unique().on(table.labelId, table.version)]
);

export const printJobs = sqliteTable('print_jobs', {
  id: text('id').primaryKey(),
  labelId: text('label_id')
    .notNull()
    .references(() => labels.id),
  labelVersion: integer('label_version').notNull(),
  printer: text('printer').notNull(),
  status: text('status').notNull(),
  copies: integer('copies').notNull().default(1),
  totalChunks: integer('total_chunks').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
