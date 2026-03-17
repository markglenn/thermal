import { pgTable, text, integer, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';

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
    status: text('status', { enum: ['draft', 'production'] }).notNull(),
    document: jsonb('document').notNull(),
    thumbnail: text('thumbnail'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [unique().on(table.labelId, table.version)]
);
