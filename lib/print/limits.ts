/**
 * Operational guards on print requests. Shared between the client
 * (PrintDialog) and the API route so the limits stay in sync.
 */

/**
 * Maximum rows per print job. A single job generates one ZPL block per
 * row; at 500 rows × ~100 KB (image-heavy labels), ZPL payload is ~50 MB
 * and physical print time is ~8 minutes — a plausible worst case. Beyond
 * this, jobs should be split at the application level.
 */
export const MAX_PRINT_ROWS = 500;
