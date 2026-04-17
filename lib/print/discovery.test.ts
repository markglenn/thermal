import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Readable } from 'stream';
import { sdkStreamMixin } from '@smithy/util-stream';

type SendMock = ReturnType<typeof vi.fn>;

// Hoisted mock: when sqs.ts is imported, getS3Client returns a stub
// whose `send` is our SendMock we can wire up per-test.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() as SendMock }));

vi.mock('./sqs', () => ({
  getS3Client: () => ({ send: sendMock }),
  getSqsClient: () => ({ send: vi.fn() }),
}));

function streamBody(obj: unknown) {
  const stream = Readable.from([Buffer.from(JSON.stringify(obj))]);
  return sdkStreamMixin(stream);
}

function baseManifest() {
  return {
    siteId: 'site-a',
    siteName: 'Site A',
    queueUrl: 'https://sqs.example/print-site-a',
    printers: [],
    updatedAt: '2026-04-17T12:00:00Z',
  };
}

describe('listSites — S3-based liveness', () => {
  beforeEach(() => {
    process.env.PRINT_BUCKET = 'test-bucket';
    delete process.env.AWS_ENDPOINT_SQS;
    delete process.env.THERMAL_SITE_STALENESS_MS;
    sendMock.mockReset();
    return import('./discovery').then(({ listSites }) => listSites(true).catch(() => {}));
  });

  afterEach(() => {
    sendMock.mockReset();
  });

  it('marks a site online when the manifest was written within the staleness window', async () => {
    const now = new Date('2026-04-17T12:00:00Z');
    const lastModified = new Date(now.getTime() - 30_000); // 30s old

    sendMock
      .mockResolvedValueOnce({
        CommonPrefixes: [{ Prefix: 'sites/site-a/' }],
      })
      .mockResolvedValueOnce({
        Body: streamBody(baseManifest()),
        LastModified: lastModified,
        $metadata: { responseDate: now.toUTCString() },
      });

    const { listSites } = await import('./discovery');
    const sites = await listSites(true);
    expect(sites).toHaveLength(1);
    expect(sites[0].online).toBe(true);
    expect(sites[0].manifestAgeMs).toBe(30_000);
    expect(sites[0].lastModified).toBe(lastModified.toISOString());
  });

  it('marks a site offline when manifest is older than the staleness threshold', async () => {
    const now = new Date('2026-04-17T12:00:00Z');
    const lastModified = new Date(now.getTime() - 10 * 60_000); // 10 min old

    sendMock
      .mockResolvedValueOnce({
        CommonPrefixes: [{ Prefix: 'sites/site-a/' }],
      })
      .mockResolvedValueOnce({
        Body: streamBody(baseManifest()),
        LastModified: lastModified,
        $metadata: { responseDate: now.toUTCString() },
      });

    const { listSites } = await import('./discovery');
    const sites = await listSites(true);
    expect(sites).toHaveLength(1);
    expect(sites[0].online).toBe(false);
    expect(sites[0].manifestAgeMs).toBeGreaterThan(180_000);
  });

  it('respects THERMAL_SITE_STALENESS_MS override', async () => {
    process.env.THERMAL_SITE_STALENESS_MS = '600000'; // 10 min
    const now = new Date('2026-04-17T12:00:00Z');
    const lastModified = new Date(now.getTime() - 5 * 60_000); // 5 min old — over default, under override

    sendMock
      .mockResolvedValueOnce({
        CommonPrefixes: [{ Prefix: 'sites/site-a/' }],
      })
      .mockResolvedValueOnce({
        Body: streamBody(baseManifest()),
        LastModified: lastModified,
        $metadata: { responseDate: now.toUTCString() },
      });

    const { listSites } = await import('./discovery');
    const sites = await listSites(true);
    expect(sites[0].online).toBe(true);
  });

  it('treats a negative age (clock edge cases) as offline', async () => {
    const now = new Date('2026-04-17T12:00:00Z');
    const lastModified = new Date(now.getTime() + 10_000); // LastModified "in the future"

    sendMock
      .mockResolvedValueOnce({
        CommonPrefixes: [{ Prefix: 'sites/site-a/' }],
      })
      .mockResolvedValueOnce({
        Body: streamBody(baseManifest()),
        LastModified: lastModified,
        $metadata: { responseDate: now.toUTCString() },
      });

    const { listSites } = await import('./discovery');
    const sites = await listSites(true);
    expect(sites[0].online).toBe(false);
    expect(sites[0].manifestAgeMs).toBe(-10_000);
  });
});
