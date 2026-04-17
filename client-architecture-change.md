# Thermal Client Architecture Change: SNS → SQS Reply Queues

## Context

The `thermal-print-server` has moved off SNS. Thermal — which acts as the gateway between upstream apps (ERP, etc.) and the print servers — needs to update how it communicates with print servers. This document describes the architectural shift; it does not prescribe code changes.

## What the server changed

Previously the print server published every event (`job_status`, `printer_change`, `heartbeat`) to a single SNS topic that consumers subscribed to. That model has been replaced with two separate mechanisms:

1. **Per-request SQS replies for job status.** Each SQS print-job message may now include a `replyToQueueUrl` field. When the job completes or fails, the server sends a `job_status` message to that exact queue. If no reply URL is provided, no response is sent (fire-and-forget).

2. **S3 manifest for printer state and liveness.** The printer list for each site continues to live at `s3://{bucket}/sites/{siteId}/manifest.json`, rewritten on startup, on printer changes, and every heartbeat interval. There is no longer a `printer_change` or `heartbeat` event stream — consumers read the manifest directly. Site liveness is determined from the **S3 object's `LastModified` timestamp**, compared against the S3 response's `Date` header.

## Why

The motivation is twofold.

**Topology match.** Thermal is the *only* consumer of print-server responses. Upstream apps (ERP, etc.) talk to Thermal over HTTP and never touch AWS directly. In that topology, SNS fan-out solves a problem we don't have — there's only ever one subscriber. A direct point-to-point SQS reply is the simpler correct shape.

**Clock-skew–free liveness.** The `LastModified` timestamp on the S3 object is set by S3 itself, and S3 responses include a `Date` header representing "now" on the same clock. Comparing those two avoids any clock-skew issue between Thermal's host and the print-server's host. The old heartbeat-event approach required both sides' clocks to be in sync to interpret a heartbeat's timestamp correctly.

## Architectural diagram

```
Before:
                   +---------------+
                   |     SNS       |
                   |     topic     |
                   +-------+-------+
                   sub'd   |
                   by      v
ERP --HTTP--> Thermal <--- SQS queue <--- Print Server
              (SNS subscriber loop
               + per-site state cache)

After:
                                  Print Server
                                     |
                                     | writes per-tick
                                     v
                            +----------------+
                            |    S3 manifest |
                            +-------+--------+
                                    ^
                                    | polls
                                    |
ERP --HTTP--> Thermal ---------> SQS request queue ---> Print Server
                |                                              |
                |<--------- SQS reply queue <------------------+
                           (Thermal owns; URL sent with each request)
```

## What Thermal must change

### 1. Own an SQS reply queue

Thermal needs a single SQS reply queue that it owns. Recommended approach:

- **Provision it via infrastructure** (Terraform/CDK/etc.), one per Thermal environment (dev, staging, prod). Not one per request, not one per instance.
- **All Thermal instances in a given environment poll the same reply queue** (competing-consumer pattern). Whichever instance picks up a reply looks up the originating upstream from the shared DB and fires the HTTP callback.
- Dynamic runtime queue creation (`CreateQueue` on boot) works too, but adds a cleanup concern and requires extra IAM permissions. Not recommended for a known, fixed Thermal deployment topology.

### 2. Include `replyToQueueUrl` in every print request

Every SQS message Thermal sends to a print server's request queue now includes the reply queue's URL. The server echoes the `jobId` back in the status response, which is how Thermal correlates a reply to the original request (and thence to the upstream caller).

### 3. Replace the SNS subscriber loop with a plain SQS consumer

The existing code that subscribes an SQS queue to SNS and processes events is replaced by a simpler pattern: long-poll the reply queue (`WaitTimeSeconds=20` — AWS recommendation), read the `job_status` message body, look up the `jobId` in the local job tracker, and fire the upstream HTTP callback. Delete the SQS message on success.

There is only one event type on this path (`job_status`). Multi-type filtering is no longer needed.

### 4. Replace event-driven printer state with S3 polling

Thermal previously updated its cached printer list in response to `printer_change` events and tracked site liveness via `heartbeat` event arrival. That moves to a polling model:

- **Printer state**: periodically re-read `sites/*/manifest.json` from S3 (60s is reasonable) and replace the cached printer list from the response.
- **Site liveness**: on each manifest read, compute `S3 response Date − object LastModified`. If the gap exceeds a staleness threshold (recommend 2–3× the site's heartbeat interval — so 2–3 minutes with the default 60s heartbeat), mark the site offline.

No push stream, no event listener.

### 5. IAM adjustments

- **Thermal's IAM role** needs: `sqs:ReceiveMessage` and `sqs:DeleteMessage` on Thermal's reply queue; `sqs:SendMessage` on each print server's request queue; `s3:GetObject` and `s3:ListBucket` on the manifest prefix.
- **Print server's IAM role** should have `sqs:SendMessage` scoped to a queue name pattern (e.g. `thermal-replies-*`). This prevents a compromised or malicious sender from putting an arbitrary queue URL in a request message and redirecting replies to an attacker-controlled queue. Coordinate the pattern with whoever owns the print server's IAM policy.

## Migration plan

This is a clean swap — no dual-publish transition on the server side. Thermal and print servers need to deploy together.

Suggested order:

1. **Provision** the Thermal reply queue in each environment.
2. **Update Thermal** to: send `replyToQueueUrl` on every print request; poll the reply queue; poll S3 for printer state and liveness. Deploy behind a feature flag if it's risky, or in a staging environment first.
3. **Deploy the updated print server** (it's already merged, but not yet run anywhere except dev).
4. **Cut over** in staging, verify the end-to-end flow, then prod.
5. **Remove** Thermal's SNS subscriber code and any SNS topic ARNs from config.

Because responses would simply not arrive if one side is upgraded and the other isn't, the failure mode is timeouts on the upstream — not data loss. That makes the cutover relatively safe to coordinate.

## Open questions for the Thermal team

Things the print-server side deliberately didn't decide:

- **Reply queue naming convention.** Suggestion: `thermal-replies-{env}` (e.g. `thermal-replies-prod`) so the server's IAM pattern can be tight.
- **Staleness threshold for liveness.** Default recommendation: 3× the site's heartbeat interval. Thermal may want a tunable per-site override for sites that have known-flaky networking.
- **Backfill on reconnect.** If Thermal is down when a `job_status` message is sent, SQS holds it until Thermal comes back and polls. No changes needed — SQS retention handles this — but worth flagging that retention period on the reply queue should be tuned to the longest acceptable outage (default 4 days is probably plenty).
- **Metrics and observability.** The SNS path used to give per-subscriber CloudWatch metrics for free. On the SQS reply model, Thermal should track reply-queue depth and age-of-oldest-message as its own operational signals.
- **What happens to jobs without `replyToQueueUrl`.** If any upstream path legitimately wants fire-and-forget prints (no callback needed), that's now supported by simply omitting the field. If no such path exists, Thermal should always send it and treat omission as a bug.
