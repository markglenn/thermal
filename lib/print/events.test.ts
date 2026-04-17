import { describe, it, expect } from 'vitest';
import type { JobStatusEvent } from './events';

describe('JobStatusEvent shape', () => {
  it('represents a completed job', () => {
    const event: JobStatusEvent = {
      eventType: 'job_status',
      siteId: 'site-1',
      jobId: 'job-1',
      status: 'completed',
      printer: 'printer-1',
      error: null,
      timestamp: '2026-04-17T12:00:00Z',
    };

    expect(event.eventType).toBe('job_status');
    expect(event.status).toBe('completed');
    expect(event.error).toBeNull();
  });

  it('represents a failed job with an error message', () => {
    const event: JobStatusEvent = {
      eventType: 'job_status',
      siteId: 'site-1',
      jobId: 'job-2',
      status: 'failed',
      printer: null,
      error: 'Printer offline',
      timestamp: '2026-04-17T12:05:00Z',
    };

    expect(event.status).toBe('failed');
    expect(event.error).toBe('Printer offline');
  });
});
