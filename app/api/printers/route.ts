import { NextResponse } from 'next/server';
import { listSites, printerStateLabel } from '@/lib/print/discovery';
import { requireRole, isAuthError } from '@/lib/auth/require-role';

export async function GET() {
  const session = await requireRole('viewer');
  if (isAuthError(session)) return session;

  try {
    const sites = await listSites();

    return NextResponse.json({
      sites: sites.map((site) => ({
        siteId: site.siteId,
        siteName: site.siteName,
        queueUrl: site.queueUrl,
        updatedAt: site.updatedAt,
        online: site.online,
        manifestAgeMs: site.manifestAgeMs,
        lastModified: site.lastModified,
        printers: site.printers.map((p) => ({
          name: p.name,
          state: p.state,
          stateLabel: printerStateLabel(p.state),
          info: p.info,
          location: p.location,
          dpi: p.resolution_default?.x ?? null,
          mediaDefault: p.media_default,
          mediaReady: p.media_ready,
        })),
      })),
    });
  } catch (e) {
    console.error('GET /api/printers failed:', e);
    return NextResponse.json({ error: 'Failed to list printers' }, { status: 500 });
  }
}
