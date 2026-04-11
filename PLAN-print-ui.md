# Print UI — Implementation Plan

## What Exists Today

- `lib/print/sqs.ts` — publishes a print job to a hardcoded `PRINT_QUEUE_URL` (single queue)
- `lib/print/types.ts` — `PrintJobMessage` with inline/S3 delivery, metadata with labelSize/dpmm
- `lib/print/compress.ts` — gzip for large jobs
- `app/api/labels/[id]/print/route.ts` — generates merged ZPL, queues to SQS, records job in DB
- `app/api/print-jobs/route.ts` — lists jobs from DB (status is always `queued`, never updated)
- `print_jobs` DB table — stores job records but has no way to receive status updates

## Local Dev Setup

The print server's docker-compose (`../thermal-print-server/docker-compose.yml`) runs mock AWS services:

| Service | Internal | Host port | Purpose |
|---------|----------|-----------|---------|
| goaws | goaws:4100 | localhost:4100 | Mock SQS + SNS |
| minio | minio:9000 | localhost:9100 | Mock S3 |

goaws is pre-configured with:
- `thermal-print-queue` — print server consumes jobs from here
- `thermal-response-queue` — subscribed to `thermal-events` SNS topic (raw delivery)
- `thermal-events` — SNS topic the print server publishes to

minio has bucket `thermal-print-jobs` with manifests at `sites/{siteId}/manifest.json`.

Credentials: `test` / `testtest1`

### Thermal `.env.local` additions for local dev

```
PRINT_BUCKET=thermal-print-jobs
RESPONSE_QUEUE_URL=http://localhost:4100/000000000000/thermal-response-queue
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=testtest1
AWS_REGION=us-east-1
```

### AWS SDK endpoint overrides

The AWS SDK clients in `lib/print/sqs.ts` currently use default endpoints (real AWS). For local dev, they need to point at goaws and minio. Use optional env vars:

```
AWS_ENDPOINT_SQS=http://localhost:4100
AWS_ENDPOINT_S3=http://localhost:9100
```

Apply in the SDK client constructors:
```typescript
new SQSClient({
  ...(process.env.AWS_ENDPOINT_SQS && {
    endpoint: process.env.AWS_ENDPOINT_SQS,
    forcePathStyle: true,
  }),
})
```

Same pattern for S3Client with `AWS_ENDPOINT_S3` and `forcePathStyle: true` (required for minio).

## What the Print Server Provides

Each print server instance is a **site** (e.g. "Denver Warehouse", "Main Office"). Sites publish to a shared SNS topic and write printer manifests to S3.

### S3 Manifests (printer discovery)

Each site writes `s3://{bucket}/sites/{siteId}/manifest.json`:

```json
{
  "siteId": "warehouse-denver",
  "siteName": "Denver Warehouse",
  "queueUrl": "https://sqs.../denver-print-queue",
  "printers": [
    {
      "name": "ZebraZD420-Dock3",
      "state": 3,
      "info": "Shipping label printer",
      "location": "Dock 3",
      "resolution_default": { "x": 203, "y": 203, "unit": "dpi" },
      "media_default": "oe_4x6-label_4x6in",
      "media_ready": ["oe_4x6-label_4x6in"],
      "media_supported": ["oe_4x6-label_4x6in", "oe_4x4-label_4x4in"]
    }
  ],
  "updatedAt": "2026-04-05T22:11:25Z"
}
```

Printer states: 3=Idle, 4=Processing, 5=Stopped.

### SNS Events (job status, printer changes, heartbeats)

Published to `RESPONSE_TOPIC_ARN` with message attributes `site_id` and `event_type`. In local dev, goaws routes these to `thermal-response-queue` with raw delivery (no SNS wrapper to unwrap).

**`job_status`** — only terminal states:
```json
{
  "siteId": "warehouse-denver",
  "eventType": "job_status",
  "jobId": "...",
  "status": "completed" | "failed",
  "printer": "ZebraZD420-Dock3",
  "error": null | "reason",
  "timestamp": "..."
}
```

**`printer_change`** — full printer list replacement:
```json
{
  "siteId": "warehouse-denver",
  "eventType": "printer_change",
  "printers": [ ... ],
  "timestamp": "..."
}
```

**`heartbeat`** — site liveness:
```json
{
  "siteId": "warehouse-denver",
  "eventType": "heartbeat",
  "printerCount": 3,
  "uptimeSeconds": 3600,
  "timestamp": "..."
}
```

---

## Implementation Plan

### Phase 0: AWS SDK Endpoint Overrides

**Goal:** Existing print code works against goaws/minio in local dev.

1. **Update `lib/print/sqs.ts`** — configure `SQSClient` and `S3Client` with optional endpoint overrides from `AWS_ENDPOINT_SQS` and `AWS_ENDPOINT_S3` env vars. Add `forcePathStyle: true` for S3 (required for minio).

2. **Add env vars to `.env.local`** — `PRINT_BUCKET`, `RESPONSE_QUEUE_URL`, AWS credentials, endpoint overrides.

3. **Verify** — start the print server's docker-compose, send a test print from Thermal, confirm it arrives in goaws.

### Phase 1: Printer Discovery (backend)

**Goal:** API endpoint that returns available printers grouped by site.

1. **`lib/print/discovery.ts`** — reads S3 manifests
   - `listSites()` — list `sites/` prefix in S3, read each `manifest.json`
   - Cache manifests in memory with TTL (e.g. 60s)
   - Parse printer state into human-readable status

2. **`app/api/printers/route.ts`** — `GET /api/printers`
   - Returns `{ sites: [{ siteId, siteName, queueUrl, printers: [...], updatedAt }] }`
   - Uses cached manifests from discovery module

3. **Update `lib/print/sqs.ts`** — `publishPrintJob` currently uses a hardcoded `PRINT_QUEUE_URL`
   - Accept `queueUrl` as a parameter instead of reading from env
   - The caller passes the queue URL from the site's manifest
   - In local dev, the manifest's `queueUrl` uses `goaws:4100` (internal Docker hostname) — the caller must rewrite this to `localhost:4100` if needed, or the discovery module handles it

4. **Update `app/api/labels/[id]/print/route.ts`**
   - Accept `siteId` in the request body alongside `printer`
   - Look up the site's `queueUrl` from the manifest
   - Record `siteId` on the print job

5. **Schema change** — add `siteId` column to `print_jobs` table

### Phase 2: Event Consumption (backend)

**Goal:** Receive job status updates from the print server and update local state.

1. **`lib/print/events.ts`** — polls `RESPONSE_QUEUE_URL`
   - `pollEvents()` — receives messages, deletes after processing, returns typed events
   - In local dev (goaws with raw delivery): messages are the event JSON directly
   - In prod (real SNS→SQS): messages are wrapped in an SNS envelope — unwrap first
   - Handles `job_status`, `printer_change`, `heartbeat`

2. **`app/api/print-events/route.ts`** — `POST /api/print-events/poll`
   - Triggers a poll of the response queue
   - For `job_status`: update `print_jobs` row in DB (status, error, completedAt)
   - For `printer_change`: invalidate printer discovery cache
   - Returns events to the caller (frontend can use this for live updates)

3. **Schema change** — update `print_jobs` table:
   - Add `completedAt` timestamp column
   - Add `error` text column
   - Expand `status` to support: `queued`, `completed`, `failed`

### Phase 3: Print Dialog (frontend)

**Goal:** Modal for selecting a site, printer, copies, and submitting a print job.

1. **`hooks/use-printers.ts`** — fetches `GET /api/printers`, caches in state
   - Groups printers by site
   - Tracks site health (stale `updatedAt` = possibly offline)
   - Remember last-used printer in localStorage

2. **`components/print/PrintDialog.tsx`** — modal with:
   - **Site picker** — dropdown (or auto-select if only one site)
   - **Printer picker** — list of printers for selected site
     - Status indicator (green=idle, yellow=processing, red=stopped)
     - Media info (loaded label size)
     - Location/description
   - **Copies** — number input
   - **Data fields** — if the label has variable bindings, show inputs for them
   - **Print button** — submits to `POST /api/labels/{id}/print`
   - **Status feedback** — shows "Queued" immediately, polls for completion

3. **Toolbar integration** — print button in the toolbar opens the dialog

### Phase 4: Job History (frontend)

**Goal:** View past print jobs and their outcomes.

1. **Update `app/api/print-jobs/route.ts`** — return new fields (`siteId`, `completedAt`, `error`)

2. **`components/print/PrintHistory.tsx`** — table/list showing:
   - Job ID, printer, status badge, copies, timestamp
   - Error message for failed jobs
   - Filter by label, by status

3. **Accessible from** — toolbar menu item or label browser context

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRINT_BUCKET` | Yes | S3 bucket for manifests and large jobs |
| `RESPONSE_QUEUE_URL` | For events | SQS queue subscribed to the SNS response topic |
| `AWS_ACCESS_KEY_ID` | Yes | AWS credentials (use `test` for local dev) |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS credentials (use `testtest1` for local dev) |
| `AWS_REGION` | Yes | AWS region (default `us-east-1`) |
| `AWS_ENDPOINT_SQS` | Local dev only | Override SQS endpoint (`http://localhost:4100`) |
| `AWS_ENDPOINT_S3` | Local dev only | Override S3 endpoint (`http://localhost:9100`) |

`PRINT_QUEUE_URL` becomes optional — queue URLs come from site manifests. Falls back to env var if no site specified (backward compat).

## Open Questions

- **Polling vs push for job status in the browser?** Polling `/api/print-events/poll` every few seconds is simplest. SSE is fancier but adds complexity.
- **Queue URL rewriting in local dev** — manifests written by the print server use internal Docker hostnames (e.g. `http://goaws:4100/...`). The discovery module needs to rewrite these to localhost when `AWS_ENDPOINT_SQS` is set.
- **Multi-chunk jobs** — defer. Only relevant for very large merge batches.
