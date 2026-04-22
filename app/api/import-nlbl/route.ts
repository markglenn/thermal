import { NextRequest, NextResponse } from 'next/server';
import { parseNlbl, type KnownLabelSize } from '@/lib/nlbl';
import { getDatabase } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth/require-role';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const session = await requireRole('editor', request);
  if (isAuthError(session)) return session;

  try {
    const password = process.env.NLBL_PASSWORD;
    if (!password) {
      return NextResponse.json(
        { error: 'NLBL_PASSWORD environment variable is not configured' },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Send a .nlbl file as "file" in form data.' },
        { status: 400 },
      );
    }

    if (!file.name.endsWith('.nlbl')) {
      return NextResponse.json(
        { error: 'File must be a .nlbl file' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large (max 10 MB)' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { db, tables } = await getDatabase();
    const rows = await db.select({
      widthDots: tables.labelSizes.widthDots,
      heightDots: tables.labelSizes.heightDots,
      dpi: tables.labelSizes.dpi,
      unit: tables.labelSizes.unit,
    }).from(tables.labelSizes);
    const knownSizes: KnownLabelSize[] = rows.map((r) => ({
      ...r,
      unit: r.unit as 'in' | 'mm',
    }));

    const { document, name } = await parseNlbl(buffer, password, knownSizes);

    return NextResponse.json({ document, name });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to import NiceLabel file: ${message}` },
      { status: 422 },
    );
  }
}
