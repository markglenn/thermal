import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq, desc } from 'drizzle-orm';
import * as schema from './schema-sqlite';
import type { LabelDocument } from '../types';

const TEST_DB_PATH = path.join(__dirname, '../../thermal-test-labels.db');

const sampleDocument: LabelDocument = {
  version: 1,
  label: { dpi: 203, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] },
  components: [],
};

const sampleDocumentWithText: LabelDocument = {
  version: 1,
  label: { dpi: 203, variants: [{ name: 'Default', widthDots: 406, heightDots: 203, unit: 'in' }] },
  components: [
    {
      id: 'comp_1',
      name: 'Text',
      layout: { x: 10, y: 20, width: 100, height: 30, horizontalAnchor: 'left', verticalAnchor: 'top' },
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

async function createLabel(name: string, doc: LabelDocument = sampleDocument) {
  const labelId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const now = new Date();

  await db.insert(schema.labels).values({
    id: labelId,
    name,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.labelVersions).values({
    id: versionId,
    labelId,
    version: 1,
    status: null,
    document: doc,
    thumbnail: null,
    createdAt: now,
  });

  return labelId;
}

beforeEach(async () => {
  // Fresh DB for each test
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

  const client = createClient({ url: `file:${TEST_DB_PATH}` });
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(__dirname, '../../drizzle/sqlite') });
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
    it('inserts a label and version 1 as draft', async () => {
      const labelId = await createLabel('Test Label');

      const labels = await db.select().from(schema.labels);
      expect(labels).toHaveLength(1);
      expect(labels[0].id).toBe(labelId);
      expect(labels[0].name).toBe('Test Label');

      const versions = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId));
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe(1);
      expect(versions[0].status).toBeNull();
    });

    it('stores the document as JSON', async () => {
      const labelId = await createLabel('Doc Test', sampleDocumentWithText);

      const versions = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId));

      const doc = versions[0].document as LabelDocument;
      expect(doc.version).toBe(1);
      expect(doc.label.dpi).toBe(203);
      expect(doc.components).toHaveLength(1);
      expect(doc.components[0].name).toBe('Text');
    });
  });

  describe('list labels', () => {
    it('returns empty array when no labels exist', async () => {
      const labels = await db.select().from(schema.labels);
      expect(labels).toHaveLength(0);
    });

    it('returns all labels ordered by updatedAt desc', async () => {
      await createLabel('First');
      await createLabel('Second');

      const labels = await db
        .select()
        .from(schema.labels)
        .orderBy(desc(schema.labels.updatedAt));
      expect(labels).toHaveLength(2);
    });

    it('can retrieve latest version for each label', async () => {
      const labelId = await createLabel('Versioned');

      // Add a second version
      await db.insert(schema.labelVersions).values({
        id: crypto.randomUUID(),
        labelId,
        version: 2,
        status: null,
        document: sampleDocument,
        thumbnail: null,
        createdAt: new Date(),
      });

      const versions = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .orderBy(desc(schema.labelVersions.version))
        .limit(1);

      expect(versions[0].version).toBe(2);
    });
  });

  describe('get single label', () => {
    it('returns label with latest version document', async () => {
      const labelId = await createLabel('Get Test', sampleDocumentWithText);

      const labelRows = await db
        .select()
        .from(schema.labels)
        .where(eq(schema.labels.id, labelId))
        .limit(1);

      expect(labelRows).toHaveLength(1);
      expect(labelRows[0].name).toBe('Get Test');

      const versions = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .orderBy(desc(schema.labelVersions.version))
        .limit(1);

      const doc = versions[0].document as LabelDocument;
      expect(doc.components).toHaveLength(1);
    });

    it('returns empty when label does not exist', async () => {
      const labelRows = await db
        .select()
        .from(schema.labels)
        .where(eq(schema.labels.id, 'nonexistent'))
        .limit(1);

      expect(labelRows).toHaveLength(0);
    });
  });

  describe('update label (save)', () => {
    it('overwrites existing draft version', async () => {
      const labelId = await createLabel('Update Test');

      // Get the existing draft
      const versions = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .orderBy(desc(schema.labelVersions.version))
        .limit(1);

      const latest = versions[0];
      expect(latest.status).toBeNull();

      // Update it
      const updatedDoc = { ...sampleDocument, components: [] };
      await db.update(schema.labelVersions)
        .set({ document: updatedDoc, createdAt: new Date() })
        .where(eq(schema.labelVersions.id, latest.id));

      // Should still be 1 version
      const allVersions = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId));
      expect(allVersions).toHaveLength(1);
    });

    it('creates new version when latest is production', async () => {
      const labelId = await createLabel('Version Test');

      // Set version 1 to production
      const versions = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId));

      await db.update(schema.labelVersions)
        .set({ status: 'published' })
        .where(eq(schema.labelVersions.id, versions[0].id));

      // Now "save" should create version 2
      await db.insert(schema.labelVersions).values({
        id: crypto.randomUUID(),
        labelId,
        version: 2,
        status: null,
        document: sampleDocumentWithText,
        thumbnail: null,
        createdAt: new Date(),
      });

      const allVersions = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId))
        .orderBy(desc(schema.labelVersions.version));

      expect(allVersions).toHaveLength(2);
      expect(allVersions[0].version).toBe(2);
      expect(allVersions[0].status).toBeNull();
      expect(allVersions[1].version).toBe(1);
      expect(allVersions[1].status).toBe('published');
    });

    it('updates label name and updatedAt on save', async () => {
      const labelId = await createLabel('Old Name');

      const now = new Date();
      await db.update(schema.labels)
        .set({ name: 'New Name', updatedAt: now })
        .where(eq(schema.labels.id, labelId));

      const after = await db
        .select()
        .from(schema.labels)
        .where(eq(schema.labels.id, labelId));

      expect(after[0].name).toBe('New Name');
    });
  });

  describe('delete label', () => {
    it('deletes the label and all versions', async () => {
      const labelId = await createLabel('Delete Test');

      // Add a second version
      await db.insert(schema.labelVersions).values({
        id: crypto.randomUUID(),
        labelId,
        version: 2,
        status: null,
        document: sampleDocument,
        thumbnail: null,
        createdAt: new Date(),
      });

      // Delete versions first
      await db.delete(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId));

      await db.delete(schema.labels)
        .where(eq(schema.labels.id, labelId));

      const labels = await db.select().from(schema.labels);
      expect(labels).toHaveLength(0);

      const versions = await db.select().from(schema.labelVersions);
      expect(versions).toHaveLength(0);
    });

    it('does not affect other labels', async () => {
      const id1 = await createLabel('Keep');
      const id2 = await createLabel('Delete');

      await db.delete(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, id2));
      await db.delete(schema.labels)
        .where(eq(schema.labels.id, id2));

      const labels = await db.select().from(schema.labels);
      expect(labels).toHaveLength(1);
      expect(labels[0].id).toBe(id1);
    });
  });

  describe('unique constraint', () => {
    it('enforces unique (label_id, version) pair', async () => {
      const labelId = await createLabel('Unique Test');

      await expect(
        db.insert(schema.labelVersions).values({
          id: crypto.randomUUID(),
          labelId,
          version: 1, // duplicate
          status: null,
          document: sampleDocument,
          thumbnail: null,
          createdAt: new Date(),
        })
      ).rejects.toThrow();
    });
  });

  describe('thumbnail storage', () => {
    it('stores and retrieves thumbnail as buffer', async () => {
      const labelId = await createLabel('Thumbnail Test');
      const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header

      const versions = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId));

      await db.update(schema.labelVersions)
        .set({ thumbnail: pngBytes })
        .where(eq(schema.labelVersions.id, versions[0].id));

      const updated = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.id, versions[0].id));

      // libsql returns ArrayBuffer for blobs — convert to check bytes
      const thumb = updated[0].thumbnail;
      const bytes = thumb instanceof ArrayBuffer ? new Uint8Array(thumb) : thumb;
      expect(bytes[0]).toBe(0x89);
    });

    it('allows null thumbnail', async () => {
      const labelId = await createLabel('No Thumbnail');

      const versions = await db
        .select()
        .from(schema.labelVersions)
        .where(eq(schema.labelVersions.labelId, labelId));

      expect(versions[0].thumbnail).toBeNull();
    });
  });

  describe('cascade delete', () => {
    it('deleting a label cascades to versions', async () => {
      const labelId = await createLabel('Cascade Test');

      // Delete label directly (FK cascade should remove versions)
      await db.delete(schema.labels)
        .where(eq(schema.labels.id, labelId));

      const versions = await db.select().from(schema.labelVersions);
      expect(versions).toHaveLength(0);
    });
  });
});
