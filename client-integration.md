# Thermal Client Integration Guide

How an external application connects to Thermal to send print jobs, poll their
status, and use the surrounding label/printer/site APIs.

**Scope:** every HTTP endpoint a client might touch. Thermal itself talks to
the Elixir print server over SQS — a client never touches SQS directly.

---

## 1. Architecture at a glance

```
  ┌──────────────┐   HTTPS    ┌───────────┐   SQS+S3    ┌──────────────────┐
  │  Your app    │ ─────────▶ │  Thermal  │ ──────────▶ │  Elixir print    │
  │ (ERP, etc.)  │            │ (Next.js) │             │  server (on-site)│
  └──────────────┘ ◀───────── └───────────┘ ◀────────── └──────────────────┘
                     poll                    reply queue +
                     GET                     S3 manifest
```

1. Client **POSTs** a print job with data rows to Thermal.
2. Thermal generates ZPL, publishes to the site's SQS queue, writes a
   `printJobs` row (`status: queued`), and returns **HTTP 202** immediately.
3. The on-site print server prints, then posts a `job_status` message to
   Thermal's reply queue.
4. Something (the print dialog UI, or a cron) hits **POST
   `/api/print-events`**, which drains the reply queue and flips
   `printJobs` rows to `completed` / `failed`.
5. Client **polls GET `/api/print-jobs/{jobId}`** until `status !== queued`.
   If the print server never replies, the GET self-flips the row to
   `failed` after 5 minutes with the error message
   `"Print server did not respond within 5 minutes."`

There is no webhook-back-to-the-client mechanism. Clients poll.

---

## 2. Authentication

**Thermal has no API-key / bearer-token mechanism today.** All endpoints are
gated by a NextAuth v5 **session cookie** issued after Okta OIDC sign-in.

- Provider: `okta` (scopes `openid email profile groups`).
- Cookie: `authjs.session-token` (HTTP) / `__Secure-authjs.session-token` (HTTPS). HttpOnly — not readable from JS.
- Sign-in URL: `/auth/signin`. Handler: `/api/auth/[...nextauth]`.
- Roles come from Okta groups: `thermal-admins → admin`, `thermal-editors → editor`, `thermal-viewers → viewer`. Unmatched authenticated users default to `viewer`.
- Failure shapes: `401 {"error": "Unauthorized"}` (no session), `403 {"error": "Forbidden"}` (role too low).

### Dev-mode stub
When `AUTH_OKTA_ISSUER` / `AUTH_OKTA_ID` / `AUTH_OKTA_SECRET` are unset, every request is treated as authenticated admin (`sub: 'dev'`). Useful for local integration testing; **do not rely on this in any deployed environment.**

### Practical options for a service-to-service caller
Because every endpoint requires a browser-style session, a headless client has three options:
1. **Run through Thermal itself.** If the upstream caller can host a browser-based workflow (service account in Okta, then drive the sign-in flow once to capture the cookie), the cookie can be reused for subsequent requests until it expires.
2. **Deploy a forward-proxy or BFF** that terminates NextAuth and re-exposes the endpoints to trusted callers with a simpler token scheme.
3. **Add an API-key path on the server** (not implemented yet). If this becomes a real need, open an issue — it's a small `requireRole()` change plus a per-key roles table.

---

## 3. The primary flow: print a label

### 3.1 Submit the job — `POST /api/labels/{id}/print`

- **Role required:** `editor`
- **Query params:** `?version=N` to pin a specific version (otherwise the published version is used, falling back to the latest).
- **Content-Type:** `application/json`
- **Body:**
  ```json
  {
    "data": [
      { "sku": "ABCD1234", "qty": "5" },
      { "sku": "WXYZ9999", "qty": "1" }
    ],
    "printer": "zebra-zd621-shipping",
    "siteId": "warehouse-chicago",
    "copies": 1
  }
  ```

  | Field | Type | Required | Notes |
  |---|---|---|---|
  | `data` | `Array<Record<string,string>>` | yes | One label per array entry. Keys match the label's `fieldBinding` names. |
  | `printer` | string | see note | If omitted, the endpoint returns raw ZPL as `text/plain` instead of queuing. |
  | `siteId` | string | yes when `printer` is set | Used to look up the site's SQS queue URL from the S3 manifest. |
  | `copies` | integer | no | Defaults to `1`. |

  **Limits** (from `lib/documents/validate-print.ts`):
  - Max `data` rows per request: **10,000**
  - Max fields per row: **100**
  - Max value length per field: **10,000 characters**
  - Max `copies`: **1,000**

- **Success response** (when `printer` is set): **HTTP 202**
  ```json
  {
    "jobId": "b3c5f2e9-1a7b-4c3e-9f2e-3b6a1c8d7e4a",
    "status": "queued",
    "printer": "zebra-zd621-shipping"
  }
  ```
- **Success response** (when `printer` is omitted): **HTTP 200** `text/plain`
  — the fully-merged ZPL, one block per data row. Useful for debugging or
  sending ZPL to your own printer out of band.
- **Error responses:**
  - `400` — invalid JSON, validation errors (body includes `details`), invalid `version` param, or unknown `siteId`.
  - `404` — label or version not found.
  - `500` — stored document is corrupt, or unexpected error.

### 3.2 Poll for completion — `GET /api/print-jobs/{jobId}`

- **Role required:** `viewer`
- **Response 200:**
  ```json
  {
    "id": "b3c5f2e9-…",
    "labelId": "…",
    "labelVersion": 3,
    "siteId": "warehouse-chicago",
    "printer": "zebra-zd621-shipping",
    "status": "queued" | "completed" | "failed",
    "copies": 1,
    "totalChunks": 1,
    "error": null,
    "createdAt": "2026-04-17T18:12:04.221Z",
    "completedAt": null
  }
  ```
- **404** if `jobId` is unknown.
- **Side effect:** if the job has been `queued` for >5 minutes, this GET flips it to `failed` with `error: "Print server did not respond within 5 minutes."` (conditional on `status = 'queued'` so it won't race a legitimate late reply).

### 3.3 (Operator responsibility) Drain the reply queue — `POST /api/print-events`

- **Role required:** `editor`
- **Body:** none
- **Response 200:**
  ```json
  { "processed": 2, "events": [ { "eventType": "job_status", "siteId": "…", "jobId": "…", "status": "completed" } ] }
  ```
- Long-polls SQS for up to 20 seconds per invocation and applies every `job_status` message to the `printJobs` table.
- **Thermal does not self-drain on a timer.** Today the print-dialog UI calls this while the dialog is open. If your integration is headless, you are responsible for ensuring *something* hits this endpoint — typically a cron pinging it every few seconds during business hours, or a dedicated worker loop.

### 3.4 Polling loop — reference pattern

```python
import requests, time
s = requests.Session()
s.cookies.update({"authjs.session-token": SESSION_TOKEN})

r = s.post(f"{BASE}/api/labels/{LABEL_ID}/print", json={
    "data": [{"sku": "ABCD1234"}],
    "printer": "zebra-zd621-shipping",
    "siteId": "warehouse-chicago",
})
r.raise_for_status()
job_id = r.json()["jobId"]

# drain loop — run either here or as a separate worker
deadline = time.time() + 330  # 5m 30s (endpoint's own 5-min timeout + slack)
while time.time() < deadline:
    s.post(f"{BASE}/api/print-events")           # drain replies
    status = s.get(f"{BASE}/api/print-jobs/{job_id}").json()
    if status["status"] != "queued":
        break
    time.sleep(2)

print(status["status"], status.get("error"))
```

---

## 4. Ad-hoc print without a saved label — `POST /api/print`

Use when the caller has a `LabelDocument` in hand and does not want it
persisted in Thermal.

- **Role required:** `editor`
- **Body:**
  ```json
  {
    "document": { /* full LabelDocument */ },
    "labelId": "optional, forwarded into SQS metadata",
    "labelName": "optional, forwarded into SQS metadata",
    "data": [ { "sku": "…" } ],
    "printer": "…",
    "siteId": "…",
    "copies": 1
  }
  ```
  `printer` is **required** here (not optional as it is on `/api/labels/{id}/print`). Same data-row limits as above. Also runs `validateRequiredFields` — returns `400 {"error": "Missing required fields", "details": [...]}` if the document marks a field as required and the row omits it.

- **Response:** `202 { jobId, status: "queued", printer }`, same semantics as the stored-label print.

---

## 5. Label-management endpoints

Most clients will be read-only against these. Listed for completeness.

### 5.1 List labels — `GET /api/labels`
- Role: `viewer`. Query: `archived=true` to include archived.
- Response: array of `{ id, name, hasThumbnail, latestVersion, latestStatus: "published"|null, widthInches, heightInches, archivedAt, updatedAt }`.

### 5.2 Get a label — `GET /api/labels/{id}`
- Role: `viewer`. Returns the latest non-archived version.
- Response: `{ id, name, version, status, document, updatedAt }`. `404` if not found.

### 5.3 Create a label — `POST /api/labels`
- Role: `editor`. Body: `{ name, document, thumbnail? }`.
- Response: `201 { id, name, version: 1, status: null }`.

### 5.4 Update a label — `PUT /api/labels/{id}`
- Role: `editor`. Updates the latest version **in place**.
- Body: `{ name?, document, thumbnail? }`.
- `409` if the latest version is `published` — create a new version instead.

### 5.5 Rename — `PATCH /api/labels/{id}`
- Role: `editor`. Body: `{ name }`.

### 5.6 Archive / unarchive — `DELETE /api/labels/{id}` (+ `?unarchive=true`)
- Role: `editor`. Soft delete.

### 5.7 Versions
- `GET /api/labels/{id}/versions` — list. Role: `viewer`. `?archived=true` to include archived.
- `POST /api/labels/{id}/versions` — create a new version. Role: `editor`. Body: `{ document, thumbnail? }`. Only allowed when the latest version is `published` (else `409`).
- `GET /api/labels/{id}/versions/{version}` — get a specific version. Role: `viewer`.
- `PATCH /api/labels/{id}/versions/{version}` — role: `editor`. Body: `{ production?: boolean, archived?: boolean }`. Setting `production: true` clears any other version's status for the label and publishes this one. Cannot archive a published version (`400`).

### 5.8 Thumbnails
- `GET /api/labels/{id}/thumbnail` — latest version's thumbnail PNG. Role: `viewer`. `Cache-Control: no-cache`. `404` if none stored (empty body).
- `GET /api/labels/{id}/versions/{version}/thumbnail` — per-version. Role: `viewer`.

---

## 6. Printers and sites — `GET /api/printers`

- **Role:** `viewer`
- **Query:** `?refresh=1` busts the 60-second manifest cache.
- **Response:**
  ```json
  {
    "sites": [
      {
        "siteId": "warehouse-chicago",
        "siteName": "Chicago Warehouse",
        "queueUrl": "https://sqs.us-east-1.amazonaws.com/123/print-requests-chicago",
        "updatedAt": "2026-04-17T18:10:00.000Z",
        "online": true,
        "manifestAgeMs": 42123,
        "lastModified": "2026-04-17T18:09:18.000Z",
        "printers": [
          {
            "name": "zebra-zd621-shipping",
            "state": "idle",
            "stateLabel": "Ready",
            "info": "ZTC ZD621-203dpi ZPL",
            "location": "Dock 3",
            "dpi": 203,
            "mediaDefault": "2x1",
            "mediaReady": "2x1"
          }
        ]
      }
    ]
  }
  ```
- `online` is computed from the S3 `LastModified` timestamp vs. S3's own `Date` response header (clock-skew-free). Threshold is `THERMAL_SITE_STALENESS_MS`, default **180s**.
- Use this to let users pick a `siteId` + `printer` before calling the print endpoints. Treat `online: false` as "will not print" — SQS will accept the message, but nothing is listening.

---

## 7. List print jobs — `GET /api/print-jobs`

- **Role:** `viewer`
- **Query:** `labelId?`, `limit?` (default 50, max 200), `offset?` (default 0).
- Returns an array of the same per-job shape as `GET /api/print-jobs/{id}`. Useful for dashboards or audit views.

---

## 8. Admin / configuration endpoints

Usually not touched by integration clients, but listed because they affect
the editor experience.

### 8.1 Label sizes — `/api/label-sizes`
- `GET` — role `viewer`. Array of `{ id, name, widthDots, heightDots, unit: "in"|"mm", dpi: 203|300|600 }`.
- `POST` — role **admin**. Body `{ name, widthDots, heightDots, dpi, unit? }`.
- `PUT` — role **admin**. Body `{ id, name, widthDots, heightDots, dpi, unit? }`.
- `DELETE` — role **admin**. Query: `id=<uuid>`.

### 8.2 Variable banks — `/api/variable-banks`
Reusable named field sets.
- `GET` — role `viewer`. Array of `{ id, name, fields: string[] }`.
- `POST` — role **admin**. Body `{ name, fields }`. Field names must match `/^[a-zA-Z][a-zA-Z0-9_-]*$/`.
- `PUT` — role **admin**. Body `{ id, name, fields }`.
- `DELETE` — role **admin**. Query: `id=<uuid>`.

---

## 9. Utility / internal-facing endpoints

Rarely useful to integrators, but documented for completeness:

- **`POST /api/labelary`** — role `viewer`. Proxies a ZPL preview render through `api.labelary.com`. Body: `{ zpl, dpi: 203|300|600, widthInches, heightInches }`. Returns PNG binary. Mostly used by the in-browser editor.
- **`POST /api/import-nlbl`** — role `editor`. `multipart/form-data` with `file` (.nlbl, ≤10 MB). Requires `NLBL_PASSWORD` env. Parses a NiceLabel file into a `LabelDocument` and returns it for the client to save (`200 { document, name }`). No DB writes.
- **`GET /api/fetch-image?url=...`** — role `viewer`. Server-side image fetch proxy used by the editor's image component. Returns the image with `Cache-Control: public, max-age=3600`. **No allowlist today** — any URL reachable from the Thermal server will be fetched.

---

## 10. Error model

All JSON error responses use the shape `{ "error": string, "details"?: any }`.

| Status | When |
|---|---|
| `400` | Invalid JSON body, failed validation (`details` lists `{ path, message }`), bad query param. |
| `401` | No NextAuth session. |
| `403` | Session present but role too low. |
| `404` | Resource not found (label, version, job). |
| `409` | Version-state conflict (editing a published version, creating a new version when the latest is still editable). |
| `422` | Upstream parse failure (currently only `/api/import-nlbl`) or non-image content from `/api/fetch-image`. |
| `500` | Unexpected server error, corrupt stored document, SQS publish failure. |
| `502` | Upstream fetch error (`/api/fetch-image`). |

Print-job `status` progression: `queued` → `completed` or `failed`. The only intermediate state a client will observe is `queued`. Any server-side `status` value other than the literal `completed` is coerced to `failed` at DB write time (in `lib/print/events.ts`) — a future terminal state (e.g. `canceled`) will surface in the `error` field but not strand the UI in `queued`.

---

## 11. LabelDocument shape (for `/api/print`)

If you're using `POST /api/print` (ad-hoc), you need a valid `LabelDocument`. The full type is in `lib/types.ts` in the Thermal repo; the minimal shape that will round-trip through `validateDocument` is:

```json
{
  "label": {
    "dpi": 203,
    "variants": [{ "name": "default", "widthDots": 406, "heightDots": 203 }]
  },
  "variables": [
    { "name": "sku", "type": "text", "defaultValue": "" }
  ],
  "components": [
    {
      "id": "uuid-or-any-unique-string",
      "typeData": { "type": "text", "props": { "content": "SKU:{}", "fontHeight": 30, "fontWidth": 30 } },
      "fieldBinding": "sku",
      "pins": [],
      "left": 10, "top": 10
    }
  ]
}
```

Field binding: if `fieldBinding` is set on a component and the row in `data[]` contains a key matching that name, the value is substituted into the component's `content`. Substitution rules:
- If `content` contains `{}`, that placeholder is replaced with the value (e.g. `"Rack:{}"` + `"A07"` → `"Rack:A07"`).
- Otherwise, the entire `content` is replaced with the value.
- `variables` whose `type: "text"` provide a `defaultValue` used when `data[]` omits the binding. `type: "date"` and `type: "counter"` variables resolve server-side at print time.

The editor at `/editor` generates these documents for you — for most integrations, the simpler path is to build labels in the UI and then print them by `id` via `/api/labels/{id}/print`.

---

## 12. Environment variables a client *should* know about

A client doesn't set these, but their values affect behavior:

| Env var | Controls |
|---|---|
| `PRINT_QUEUE_URL` | Fallback request-queue URL when a site manifest doesn't resolve. |
| `PRINT_BUCKET` | S3 bucket holding `sites/{siteId}/manifest.json` and large ZPL payloads (`print-jobs/{jobId}.zpl.gz`). |
| `THERMAL_REPLY_QUEUE_URL` | Where the print server sends `job_status` messages. |
| `THERMAL_SITE_STALENESS_MS` | Staleness threshold for `online` in `/api/printers` (default 180s). |
| `AUTH_OKTA_ISSUER`, `AUTH_OKTA_ID`, `AUTH_OKTA_SECRET` | Okta OIDC. If any is missing, dev-mode stub admin session is used. |

---

## 13. Checklist: integrating a headless upstream system

1. Get a NextAuth session cookie (or accept that dev-mode is admin-everywhere until Okta is wired up).
2. Discover printers via `GET /api/printers` → pick `siteId` + `printer.name`.
3. Optional: list available labels via `GET /api/labels` to let users choose.
4. Submit with `POST /api/labels/{id}/print` → keep the `jobId`.
5. Ensure **someone** calls `POST /api/print-events` on a cadence (every few seconds is fine — it long-polls, so it's cheap).
6. Poll `GET /api/print-jobs/{jobId}` until `status !== "queued"`. Treat the 5-minute timeout as your hard ceiling.
7. Surface `error` on `failed` jobs — it will contain either the print server's message or the Thermal timeout message.
