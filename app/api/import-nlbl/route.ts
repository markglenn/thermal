import { NextRequest, NextResponse } from 'next/server';
import { parseNlbl } from '@/lib/nlbl';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
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

    const { document, name } = await parseNlbl(buffer, password);

    return NextResponse.json({ document, name });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to import NiceLabel file: ${message}` },
      { status: 422 },
    );
  }
}
