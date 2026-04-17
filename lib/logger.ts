import pino from 'pino';

/**
 * Shared structured logger.
 *
 * Outputs JSON to stdout — deployment environments can pipe this into
 * whatever aggregator they use (Datadog, CloudWatch, Loki, journald, etc.)
 * via `pino-*` transports configured at the container/runtime boundary.
 * Keep the code caller-agnostic to that choice; log line shape is the
 * contract, destination is ops config.
 *
 * For prettier local dev output: `npm run dev | npx pino-pretty`.
 *
 * Conventions used across the codebase:
 *   logger.info({ jobId, siteId }, 'print job queued')
 *   logger.warn({ err, jobId }, 'SQS reply for unknown job')
 *   logger.error({ err, jobId }, 'SQS send failed')
 *
 * Always pass errors as the `err` key so pino serializes the stack trace.
 * Pass identifiers as top-level fields so downstream aggregators can index
 * on them.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'thermal' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
