import { pgTable, text, integer, doublePrecision, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';

export const labelSizes = pgTable('label_sizes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  widthInches: doublePrecision('width_inches').notNull(),
  heightInches: doublePrecision('height_inches').notNull(),
  dpi: integer('dpi').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const labels = pgTable('labels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const labelVersions = pgTable(
  'label_versions',
  {
    id: text('id').primaryKey(),
    labelId: text('label_id')
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: text('status'),
    archivedAt: timestamp('archived_at'),
    document: jsonb('document').notNull(),
    thumbnail: text('thumbnail'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [unique().on(table.labelId, table.version)]
);
