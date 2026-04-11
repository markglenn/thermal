'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { History, CheckCircle, XCircle, Clock } from 'lucide-react';
import { fetchJson } from '@/lib/client/fetch';

interface PrintJob {
  id: string;
  labelId: string;
  labelVersion: number;
  siteId: string | null;
  printer: string;
  status: string;
  copies: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface Props {
  labelId?: string;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
        <CheckCircle size={10} />
        Completed
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
        <XCircle size={10} />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
      <Clock size={10} />
      Queued
    </span>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PrintHistory({ labelId, onClose }: Props) {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    const url = labelId ? `/api/print-jobs?labelId=${labelId}` : '/api/print-jobs';
    const data = await fetchJson<PrintJob[]>(url);
    if (data) setJobs(data);
    setLoading(false);
  }, [labelId]);

  const initialized = useRef<boolean | null>(null);
  if (initialized.current === null) {
    initialized.current = true;
    fetchJobs();
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[32rem] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <History size={14} />
            Print History
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">No print jobs yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Printer</th>
                  <th className="px-4 py-2 font-medium">Copies</th>
                  <th className="px-4 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{job.printer}</td>
                    <td className="px-4 py-2.5 text-gray-500">{job.copies}</td>
                    <td className="px-4 py-2.5 text-gray-400" title={new Date(job.createdAt).toLocaleString()}>
                      {relativeTime(job.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
