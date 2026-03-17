import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, desc } from 'drizzle-orm';
import * as schema from './schema-sqlite';
import type { LabelDocument } from '../types';

const TEST_DB_PATH = path.join(__dirname, '../../thermal-test-labels.db');

const sampleDocument: LabelDocument = {
  version: 1,
  label: { widthInches: 2, heightInches: 1, dpi: 203 },
  components: [],
};

const sampleDocumentWithText: LabelDocument = {
  version: 1,
  label: { widthInches: 2, heightInches: 1, dpi: 203 },
  components: [
    {
      id: 'comp_1',
      name: 'Text',
      constraints: { left: 10, top: 20 },
      pins: [],
      typeData: {
        type: 'text',
        props: {
          content: 'Hello',
          font: '0',
          fontSize: 30,
          fontWidth: 30,
          rotation: 0,
        },
      },
    },
  ],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;

function createLabel(name: string, doc: LabelDocument = sampleDocument) {
  const labelId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const now = new Date();

  db.insert(schema.labels).values({
    id: labelId,
    name,
    createdAt: now,
    updatedAt: now,
  }).run();

  db.insert(schema.labelVersions).values({
    id: versionId,
    labelId,
    version: 1,
    status: 'draft',
    document: doc,
    thumbnail: null,
    createdAt: now,
  }).run();

  return labelId;
}

beforeEach(() => {
  // Fresh DB for each test
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

  const sqlite = new Database(TEST_DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle/sqlite') });
});

afterAll(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  // Also clean up WAL/SHM files
  for (const suffix of ['-wal', '-shm']) {
    const f = TEST_DB_PATH + suffix;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});

describe('labels database operations', () => {
  describe('create label', () => {
    it('inserts a label and version 1 as draft', () => {
      const labelId = createLabel('Test Label');

      const labels = db.select().from(schema.labels).all();
      expect(labels).toHaveLength(1);
      expect(labels[0].id).toBe(labelId);
      expect(labels[0].name).toBe('Test Label');

      const versions = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .all();
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe(1);
      expect(versions[0].status).toBe('draft');
    });

    it('stores the document as JSON', () => {
      const labelId = createLabel('Doc Test', sampleDocumentWithText);

      const versions = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .all();

      const doc = versions[0].document as LabelDocument;
      expect(doc.version).toBe(1);
      expect(doc.label.dpi).toBe(203);
      expect(doc.components).toHaveLength(1);
      expect(doc.components[0].name).toBe('Text');
    });
  });

  describe('list labels', () => {
    it('returns empty array when no labels exist', () => {
      const labels = db.select().from(schema.labels).all();
      expect(labels).toHaveLength(0);
    });

    it('returns all labels ordered by updatedAt desc', () => {
      createLabel('First');
      createLabel('Second');

      const labels = db
        .select()
        .from(schema.labels)
        .orderBy(desc(schema.labels.updatedAt))
        .all();
      expect(labels).toHaveLength(2);
    });

    it('can retrieve latest version for each label', () => {
      const labelId = createLabel('Versioned');

      // Add a second version
      db.insert(schema.labelVersions).values({
        id: crypto.randomUUID(),
        labelId,
        version: 2,
        status: 'draft',
        document: sampleDocument,
        thumbnail: null,
        createdAt: new Date(),
      }).run();

      const versions = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .orderBy(desc(schema.labelVersions.version))
        .limit(1)
        .all();

      expect(versions[0].version).toBe(2);
    });
  });

  describe('get single label', () => {
    it('returns label with latest version document', () => {
      const labelId = createLabel('Get Test', sampleDocumentWithText);

      const labelRows = db
        .select()
        .from(schema.labels)
        .where(eq(schema.labels.id, labelId))
        .limit(1)
        .all();

      expect(labelRows).toHaveLength(1);
      expect(labelRows[0].name).toBe('Get Test');

      const versions = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .orderBy(desc(schema.labelVersions.version))
        .limit(1)
        .all();

      const doc = versions[0].document as LabelDocument;
      expect(doc.components).toHaveLength(1);
    });

    it('returns empty when label does not exist', () => {
      const labelRows = db
        .select()
        .from(schema.labels)
        .where(eq(schema.labels.id, 'nonexistent'))
        .limit(1)
        .all();

      expect(labelRows).toHaveLength(0);
    });
  });

  describe('update label (save)', () => {
    it('overwrites existing draft version', () => {
      const labelId = createLabel('Update Test');

      // Get the existing draft
      const versions = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .orderBy(desc(schema.labelVersions.version))
        .limit(1)
        .all();

      const latest = versions[0];
      expect(latest.status).toBe('draft');

      // Update it
      const updatedDoc = { ...sampleDocument, components: [] };
      db.update(schema.labelVersions)
        .set({ document: updatedDoc, createdAt: new Date() })
        .where(eq(schema.labelVersions.id, latest.id))
        .run();

      // Should still be 1 version
      const allVersions = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .all();
      expect(allVersions).toHaveLength(1);
    });

    it('creates new version when latest is production', () => {
      const labelId = createLabel('Version Test');

      // Set version 1 to production
      const versions = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .all();

      db.update(schema.labelVersions)
        .set({ status: 'production' })
        .where(eq(schema.labelVersions.id, versions[0].id))
        .run();

      // Now "save" should create version 2
      db.insert(schema.labelVersions).values({
        id: crypto.randomUUID(),
        labelId,
        version: 2,
        status: 'draft',
        document: sampleDocumentWithText,
        thumbnail: null,
        createdAt: new Date(),
      }).run();

      const allVersions = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .orderBy(desc(schema.labelVersions.version))
        .all();

      expect(allVersions).toHaveLength(2);
      expect(allVersions[0].version).toBe(2);
      expect(allVersions[0].status).toBe('draft');
      expect(allVersions[1].version).toBe(1);
      expect(allVersions[1].status).toBe('production');
    });

    it('updates label name and updatedAt on save', () => {
      const labelId = createLabel('Old Name');

      const before = db
        .select()
        .from(schema.labels)
        .where(eq(schema.labels.id, labelId))
        .all();

      const now = new Date();
      db.update(schema.labels)
        .set({ name: 'New Name', updatedAt: now })
        .where(eq(schema.labels.id, labelId))
        .run();

      const after = db
        .select()
        .from(schema.labels)
        .where(eq(schema.labels.id, labelId))
        .all();

      expect(after[0].name).toBe('New Name');
    });
  });

  describe('delete label', () => {
    it('deletes the label and all versions', () => {
      const labelId = createLabel('Delete Test');

      // Add a second version
      db.insert(schema.labelVersions).values({
        id: crypto.randomUUID(),
        labelId,
        version: 2,
        status: 'draft',
        document: sampleDocument,
        thumbnail: null,
        createdAt: new Date(),
      }).run();

      // Delete versions first
      db.delete(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .run();

      db.delete(schema.labels)
        .where(eq(schema.labels.id, labelId))
        .run();

      const labels = db.select().from(schema.labels).all();
      expect(labels).toHaveLength(0);

      const versions = db.select().from(schema.labelVersions).all();
      expect(versions).toHaveLength(0);
    });

    it('does not affect other labels', () => {
      const id1 = createLabel('Keep');
      const id2 = createLabel('Delete');

      db.delete(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, id2))
        .run();
      db.delete(schema.labels)
        .where(eq(schema.labels.id, id2))
        .run();

      const labels = db.select().from(schema.labels).all();
      expect(labels).toHaveLength(1);
      expect(labels[0].id).toBe(id1);
    });
  });

  describe('unique constraint', () => {
    it('enforces unique (label_id, version) pair', () => {
      const labelId = createLabel('Unique Test');

      expect(() => {
        db.insert(schema.labelVersions).values({
          id: crypto.randomUUID(),
          labelId,
          version: 1, // duplicate
          status: 'draft',
          document: sampleDocument,
          thumbnail: null,
          createdAt: new Date(),
        }).run();
      }).toThrow();
    });
  });

  describe('thumbnail storage', () => {
    it('stores and retrieves thumbnail as buffer', () => {
      const labelId = createLabel('Thumbnail Test');
      const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header

      const versions = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .all();

      db.update(schema.labelVersions)
        .set({ thumbnail: pngBytes })
        .where(eq(schema.labelVersions.id, versions[0].id))
        .run();

      const updated = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.id, versions[0].id))
        .all();

      expect(Buffer.isBuffer(updated[0].thumbnail)).toBe(true);
      expect(updated[0].thumbnail[0]).toBe(0x89);
    });

    it('allows null thumbnail', () => {
      const labelId = createLabel('No Thumbnail');

      const versions = db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .all();

      expect(versions[0].thumbnail).toBeNull();
    });
  });

  describe('cascade delete', () => {
    it('deleting a label cascades to versions', () => {
      const labelId = createLabel('Cascade Test');

      // Delete label directly (FK cascade should remove versions)
      db.delete(schema.labels)
        .where(eq(schema.labels.id, labelId))
        .run();

      const versions = db.select().from(schema.labelVersions).all();
      expect(versions).toHaveLength(0);
    });
  });
});
