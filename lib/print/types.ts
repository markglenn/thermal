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
  labelSize: string;
  dpmm: string;
}

/**
 * Shape of the SQS message sent to the print server.
 *
 * Two delivery modes:
 * - Inline: `data` contains raw content (small jobs, < 200 KB)
 * - S3: `s3Key` points to a gzipped payload in S3 (large jobs with images)
 *
 * The print server checks for `s3Key` first — if present, fetch from S3 and gunzip.
 * Otherwise, use `data` directly.
 */
export interface PrintJobMessage {
  jobId: string;
  chunkIndex: number;
  totalChunks: number;
  printer: string;
  contentType: string;
  copies: number;
  /** SQS queue the print server sends the job_status reply to. */
  replyToQueueUrl: string;
  /** Raw content for inline delivery (small jobs). */
  data?: string;
  /** S3 key for the gzipped payload (large jobs). */
  s3Key?: string;
  metadata: PrintJobMessageMetadata;
}
