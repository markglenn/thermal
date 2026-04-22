import { pgTable, text, integer, timestamp, jsonb, customType, unique } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const labelSizes = pgTable('label_sizes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  widthDots: integer('width_dots').notNull(),
  heightDots: integer('height_dots').notNull(),
  unit: text('unit').notNull().default('in'),
  dpi: integer('dpi').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const labels = pgTable('labels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  archivedAt: timestamp('archived_at'),
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
    thumbnail: bytea('thumbnail'),
    widthDots: integer('width_dots'),
    heightDots: integer('height_dots'),
    dpi: integer('dpi'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [unique().on(table.labelId, table.version)]
);

export const variableBanks = pgTable('variable_banks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  fields: jsonb('fields').notNull(),  // string[]
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const auditEvents = pgTable('audit_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email'),
  action: text('action').notNull(),
  targetId: text('target_id'),
  detail: jsonb('detail'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  prefix: text('prefix').notNull(),
  keyHash: text('key_hash').notNull(),
  role: text('role').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
});

export const printJobs = pgTable('print_jobs', {
  id: text('id').primaryKey(),
  labelId: text('label_id')
    .references(() => labels.id),
  labelVersion: integer('label_version'),
  siteId: text('site_id'),
  printer: text('printer').notNull(),
  status: text('status').notNull(),
  copies: integer('copies').notNull().default(1),
  totalChunks: integer('total_chunks').notNull(),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});
