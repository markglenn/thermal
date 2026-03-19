import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: `Upstream returned ${response.status}` }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL did not return an image' }, { status: 422 });
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch image' },
      { status: 502 }
    );
  }
}
