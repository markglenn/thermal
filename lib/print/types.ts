export type PrintJobStatus = 'queued';

export interface PrintJob {
  id: string;
  labelId: string;
  labelVersion: number;
  printer: string;
  status: PrintJobStatus;
  copies: number;
  totalChunks: number;
  createdAt: Date;
}

export interface PrintJobMessageMetadata {
  labelId: string;
  labelVersion: number;
  labelName: string;
}

/** Shape of a single SQS message sent to the print server. */
export interface PrintJobMessage {
  jobId: string;
  chunkIndex: number;
  totalChunks: number;
  printer: string;
  zpl: string;
  copies: number;
  signature: string;
  metadata: PrintJobMessageMetadata;
  /** When true, `zpl` contains base64-encoded gzipped data. */
  compressed?: boolean;
}
