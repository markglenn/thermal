export type PrintJobStatus = 'queued';

export interface PrintJob {
  id: string;
  labelId: string;
  labelVersion: number;
  printer: string;
  status: PrintJobStatus;
  copies: number;
  createdAt: Date;
}

export interface PrintJobMessageMetadata {
  labelId: string;
  labelVersion: number;
  labelName: string;
}

/**
 * Shape of the SQS message sent to the print server.
 *
 * Two delivery modes:
 * - Inline: `zpl` contains raw ZPL text (small jobs, < 200 KB)
 * - S3: `s3Key` points to a gzipped ZPL object in S3 (large jobs with images)
 *
 * The print server checks for `s3Key` first — if present, fetch from S3 and gunzip.
 * Otherwise, use `zpl` directly.
 */
export interface PrintJobMessage {
  jobId: string;
  printer: string;
  copies: number;
  /** Raw ZPL for inline delivery (small jobs). */
  zpl?: string;
  /** S3 key for the gzipped ZPL payload (large jobs). */
  s3Key?: string;
  signature: string;
  metadata: PrintJobMessageMetadata;
}
