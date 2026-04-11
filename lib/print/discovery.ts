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
}

let _cache: { sites: SiteManifest[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

function getBucket(): string {
  const bucket = process.env.PRINT_BUCKET;
  if (!bucket) throw new Error('PRINT_BUCKET environment variable is not set');
  return bucket;
}

/**
 * Rewrite internal Docker hostnames to localhost endpoints for local dev.
 * In Docker, the print server writes queueUrl as "http://goaws:4100/..."
 * but Thermal on the host needs "http://localhost:4100/...".
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

async function fetchManifest(key: string): Promise<SiteManifest | null> {
  try {
    const s3 = getS3Client();
    const result = await s3.send(new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }));
    const body = await result.Body?.transformToString();
    if (!body) return null;
    const manifest = JSON.parse(body) as SiteManifest;
    manifest.queueUrl = rewriteQueueUrl(manifest.queueUrl);
    return manifest;
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
  const manifests = await Promise.all(
    prefixes.map((prefix) => fetchManifest(`${prefix}manifest.json`))
  );

  const sites = manifests.filter((m): m is SiteManifest => m !== null);
  _cache = { sites, fetchedAt: Date.now() };
  return sites;
}

export function invalidateCache(): void {
  _cache = null;
}

export function printerStateLabel(state: number | null): string {
  if (state === 3) return 'idle';
  if (state === 4) return 'processing';
  if (state === 5) return 'stopped';
  return 'unknown';
}
