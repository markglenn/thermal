/**
 * Bulk import NiceLabel (.nlbl) files into the database.
 *
 * Usage:
 *   npx tsx scripts/import-nlbl.ts <file-or-directory> [file-or-directory...]
 *
 * Examples:
 *   npx tsx scripts/import-nlbl.ts labels/MyLabel.nlbl
 *   npx tsx scripts/import-nlbl.ts labels/            # all .nlbl files in dir
 *   npx tsx scripts/import-nlbl.ts a.nlbl b.nlbl dir/
 *
 * Requires NLBL_PASSWORD in .env.local (or environment).
 */

import './env';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { parseNlbl, type KnownLabelSize } from '@/lib/nlbl';
import { captureThumbnail } from '@/lib/documents/thumbnail';
import { getDatabase, parseThumbnail } from '@/lib/db';
import { summaryFieldsFromDocument } from '@/lib/server/labels';

function collectNlblFiles(args: string[]): string[] {
  const files: string[] = [];
  for (const arg of args) {
    const resolved = path.resolve(arg);
    const stat = fs.statSync(resolved, { throwIfNoEntry: false });
    if (!stat) {
      console.error(`  skipping ${arg} (not found)`);
      continue;
    }
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(resolved);
      for (const entry of entries) {
        if (entry.toLowerCase().endsWith('.nlbl')) {
          files.push(path.join(resolved, entry));
        }
      }
    } else if (resolved.toLowerCase().endsWith('.nlbl')) {
      files.push(resolved);
    } else {
      console.error(`  skipping ${arg} (not a .nlbl file)`);
    }
  }
  return files;
}

async function importFile(
  filePath: string,
  password: string,
  db: Awaited<ReturnType<typeof getDatabase>>,
  knownSizes: KnownLabelSize[],
): Promise<{ name: string; id: string }> {
  const data = fs.readFileSync(filePath);
  const { document, name } = await parseNlbl(Buffer.from(data), password, knownSizes);
  const thumbnail = await captureThumbnail(document);

  const labelId = randomUUID();
  const versionId = randomUUID();
  const now = new Date();
  const summary = summaryFieldsFromDocument(document);
  const thumbnailData = parseThumbnail(thumbnail ?? undefined);

  await db.db.transaction(async (tx) => {
    await tx.insert(db.tables.labels).values({
      id: labelId,
      name,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(db.tables.labelVersions).values({
      id: versionId,
      labelId,
      version: 1,
      status: null,
      document,
      thumbnail: thumbnailData,
      ...summary,
      createdAt: now,
    });
  });

  return { name, id: labelId };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/import-nlbl.ts <file-or-directory> [...]');
    process.exit(1);
  }

  const password = process.env.NLBL_PASSWORD;
  if (!password) {
    console.error('NLBL_PASSWORD is not set. Add it to .env.local or export it.');
    process.exit(1);
  }

  const files = collectNlblFiles(args);
  if (files.length === 0) {
    console.error('No .nlbl files found.');
    process.exit(1);
  }

  console.log(`Found ${files.length} file(s) to import.\n`);

  const db = await getDatabase();
  const sizeRows = await db.db.select({
    widthDots: db.tables.labelSizes.widthDots,
    heightDots: db.tables.labelSizes.heightDots,
    dpi: db.tables.labelSizes.dpi,
    unit: db.tables.labelSizes.unit,
  }).from(db.tables.labelSizes);
  const knownSizes: KnownLabelSize[] = sizeRows.map((r) => ({
    ...r,
    unit: r.unit as 'in' | 'mm',
  }));

  const results: { file: string; name: string; id: string }[] = [];
  const failures: { file: string; error: string }[] = [];

  for (const file of files) {
    const basename = path.basename(file);
    try {
      const result = await importFile(file, password, db, knownSizes);
      results.push({ file: basename, ...result });
      console.log(`  OK  ${basename} → "${result.name}"`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ file: basename, error: msg });
      console.error(`  FAIL  ${basename}: ${msg}`);
    }
  }

  console.log(`\nDone. ${results.length} imported, ${failures.length} failed.`);
  process.exit(failures.length > 0 ? 1 : 0);
}

main();
