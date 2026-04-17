import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from './sqs';

export interface SitePrinter {
  name: string;
  state: number | null;
  info: string | null;
  location: string | null;
  resolution_default: { x: number; y: number; unit: string } | null;
  media_default: string | null;
  media_ready: string[] | null;
  media_supported: string[] | null;
}

export interface SiteManifest {
  siteId: string;
  siteName: string;
  queueUrl: string;
  printers: SitePrinter[];
  updatedAt: string;
  /** true if (S3 response Date − object LastModified) ≤ staleness threshold. */
  online: boolean;
  /** Milliseconds between the manifest's LastModified and S3's "now" at read time. */
  manifestAgeMs: number;
  /** ISO timestamp of the S3 object's LastModified. */
  lastModified: string;
}

let _cache: { sites: SiteManifest[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

// Default staleness threshold: 3× the print server's default 60s heartbeat
// interval. Override via env for sites with known-flaky networking.
const DEFAULT_STALENESS_MS = 180_000;

function getStalenessThresholdMs(): number {
  const raw = process.env.THERMAL_SITE_STALENESS_MS;
  if (!raw) return DEFAULT_STALENESS_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STALENESS_MS;
}

function getBucket(): string {
  const bucket = process.env.PRINT_BUCKET;
  if (!bucket) throw new Error('PRINT_BUCKET environment variable is not set');
  return bucket;
}

/**
 * Rewrite internal Docker hostnames to localhost endpoints for local dev.
 * In Docker, the print server writes queueUrl as "http://elasticmq:9324/..."
 * but Thermal on the host needs "http://localhost:9324/...".
 */
function rewriteQueueUrl(url: string): string {
  const sqsEndpoint = process.env.AWS_ENDPOINT_SQS;
  if (!sqsEndpoint) return url;

  try {
    const parsed = new URL(url);
    const local = new URL(sqsEndpoint);
    parsed.hostname = local.hostname;
    parsed.port = local.port;
    parsed.protocol = local.protocol;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

async function fetchManifest(key: string, stalenessMs: number): Promise<SiteManifest | null> {
  try {
    const s3 = getS3Client();
    const result = await s3.send(new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }));
    const body = await result.Body?.transformToString();
    if (!body) return null;

    const parsed = JSON.parse(body) as Omit<SiteManifest, 'online' | 'manifestAgeMs' | 'lastModified'>;

    const lastModified = result.LastModified ?? new Date(0);
    const responseDateRaw = (result.$metadata as { responseDate?: string }).responseDate;
    const responseDate = responseDateRaw ? new Date(responseDateRaw) : new Date();
    const manifestAgeMs = responseDate.getTime() - lastModified.getTime();

    return {
      ...parsed,
      queueUrl: rewriteQueueUrl(parsed.queueUrl),
      online: manifestAgeMs >= 0 && manifestAgeMs <= stalenessMs,
      manifestAgeMs,
      lastModified: lastModified.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function listSites(forceRefresh = false): Promise<SiteManifest[]> {
  if (!forceRefresh && _cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.sites;
  }

  const s3 = getS3Client();
  const listResult = await s3.send(new ListObjectsV2Command({
    Bucket: getBucket(),
    Prefix: 'sites/',
    Delimiter: '/',
  }));

  const prefixes = listResult.CommonPrefixes?.map((p) => p.Prefix).filter(Boolean) as string[] ?? [];
  const stalenessMs = getStalenessThresholdMs();
  const manifests = await Promise.all(
    prefixes.map((prefix) => fetchManifest(`${prefix}manifest.json`, stalenessMs))
  );

  const sites = manifests.filter((m): m is SiteManifest => m !== null);
  _cache = { sites, fetchedAt: Date.now() };
  return sites;
}

export function printerStateLabel(state: number | null): string {
  if (state === 3) return 'idle';
  if (state === 4) return 'processing';
  if (state === 5) return 'stopped';
  return 'unknown';
}
