import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { zpl, dpi, widthInches, heightInches } = await request.json();

    if (!zpl || !dpi || !widthInches || !heightInches) {
      return NextResponse.json(
        { error: 'Missing required fields: zpl, dpi, widthInches, heightInches' },
        { status: 400 }
      );
    }

    const dpmmMap: Record<number, number> = { 203: 8, 300: 12, 600: 24 };
    const dpmm = dpmmMap[dpi] || 8;
    const url = `http://api.labelary.com/v1/printers/${dpmm}dpmm/labels/${widthInches}x${heightInches}/0/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'image/png',
      },
      body: zpl,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Labelary API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Proxy error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
