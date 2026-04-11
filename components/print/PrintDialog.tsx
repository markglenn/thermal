'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Circle, MapPin, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { usePrinters } from '@/hooks/use-printers';
import { fetchJson } from '@/lib/client/fetch';
import { toast } from '@/lib/toast-store';
import type { LabelDocument } from '@/lib/types';
import type { Site } from '@/hooks/use-printers';

interface Props {
  labelId: string;
  document: LabelDocument;
  onClose: () => void;
}

const stateColor: Record<string, string> = {
  idle: 'text-green-500',
  processing: 'text-yellow-500',
  stopped: 'text-red-500',
  unknown: 'text-gray-400',
};

function SiteSection({ site, selectedPrinter, onSelect }: {
  site: Site;
  selectedPrinter: string | null;
  onSelect: (printer: string) => void;
}) {
  return (
    <div className="space-y-1">
      {site.printers.map((p) => (
        <button
          key={p.name}
          onClick={() => onSelect(p.name)}
          className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
            selectedPrinter === p.name
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Circle size={8} className={`fill-current ${stateColor[p.stateLabel]}`} />
            <span className="text-sm font-medium">{p.name}</span>
          </div>
          {(p.info || p.location) && (
            <div className="flex items-center gap-3 mt-0.5 ml-5">
              {p.location && (
                <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                  <MapPin size={10} />
                  {p.location}
                </span>
              )}
              {p.info && (
                <span className="text-[11px] text-gray-400">{p.info}</span>
              )}
            </div>
          )}
          {p.mediaDefault && (
            <div className="mt-0.5 ml-5 text-[11px] text-gray-400">
              Media: {p.mediaDefault}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function extractFieldNames(doc: LabelDocument): string[] {
  const names = new Set<string>();
  for (const comp of doc.components) {
    if (comp.fieldBinding) names.add(comp.fieldBinding);
  }
  return Array.from(names);
}

export function PrintDialog({ labelId, document: doc, onClose }: Props) {
  const printers = usePrinters();
  const fieldNames = useMemo(() => extractFieldNames(doc), [doc]);
  const hasFields = fieldNames.length > 0;

  const makeEmptyRow = () => Object.fromEntries(fieldNames.map((f) => [f, '']));
  const [dataRows, setDataRows] = useState<Record<string, string>[]>(() =>
    hasFields ? [makeEmptyRow()] : [{}]
  );

  const [copies, setCopies] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);

  const updateField = (rowIndex: number, field: string, value: string) => {
    setDataRows((prev) => prev.map((row, i) =>
      i === rowIndex ? { ...row, [field]: value } : row
    ));
  };

  const addRow = () => setDataRows((prev) => [...prev, makeEmptyRow()]);

  const removeRow = (index: number) => {
    setDataRows((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  // Poll for job completion
  useEffect(() => {
    if (!jobId || jobStatus === 'completed' || jobStatus === 'failed') return;

    let stopped = false;
    const poll = async () => {
      while (!stopped) {
        await fetchJson('/api/print-events', { method: 'POST' });
        const job = await fetchJson<{ status: string; error: string | null }>(`/api/print-jobs/${jobId}`);
        if (job && (job.status === 'completed' || job.status === 'failed')) {
          setJobStatus(job.status);
          if (job.status === 'completed') {
            toast('Print job completed', 'success');
          } else {
            toast(job.error || 'Print job failed', 'error');
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    };
    poll();

    return () => { stopped = true; };
  }, [jobId, jobStatus]);

  const handlePrint = async () => {
    if (!printers.selectedSite || !printers.selectedPrinter) return;

    setPrinting(true);
    const result = await fetchJson<{ jobId: string }>(`/api/labels/${labelId}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: dataRows,
        printer: printers.selectedPrinter,
        siteId: printers.selectedSite.siteId,
        copies,
      }),
    });

    if (result) {
      setJobId(result.jobId);
      setJobStatus('queued');
    }
    setPrinting(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`bg-white rounded-lg shadow-xl max-h-[80vh] flex flex-col overflow-hidden ${hasFields ? 'w-[28rem]' : 'w-96'}`}>
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Printer size={14} />
            Print
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {printers.loading ? (
            <div className="text-center text-sm text-gray-400 py-8">Loading printers...</div>
          ) : printers.sites.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <AlertCircle size={24} className="mx-auto text-gray-300" />
              <p className="text-sm text-gray-400">No print servers found</p>
              <p className="text-xs text-gray-400">Make sure the print server is running and has published its manifest.</p>
            </div>
          ) : (
            <>
              {/* Site picker (only if multiple) */}
              {printers.sites.length > 1 && (
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Site</span>
                  <select
                    value={printers.selectedSiteId ?? ''}
                    onChange={(e) => printers.setSelectedSiteId(e.target.value || null)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Select a site...</option>
                    {printers.sites.map((s) => (
                      <option key={s.siteId} value={s.siteId}>{s.siteName}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Printer list */}
              {printers.selectedSite && (
                <div>
                  <span className="text-xs text-gray-500 block mb-1">
                    Printer
                    {printers.selectedSite.printers.length > 0 && (
                      <span className="text-gray-400"> ({printers.selectedSite.printers.length})</span>
                    )}
                  </span>
                  {printers.selectedSite.printers.length === 0 ? (
                    <div className="text-sm text-gray-400 py-4 text-center">No printers available at this site</div>
                  ) : (
                    <SiteSection
                      site={printers.selectedSite}
                      selectedPrinter={printers.selectedPrinter}
                      onSelect={(name) => printers.selectPrinter(printers.selectedSite!.siteId, name)}
                    />
                  )}
                </div>
              )}

              {/* Variable fields */}
              {printers.selectedPrinter && hasFields && (
                <div>
                  <span className="text-xs text-gray-500 block mb-1">
                    Data
                    {dataRows.length > 1 && <span className="text-gray-400"> ({dataRows.length} labels)</span>}
                  </span>
                  <div className="space-y-2">
                    {dataRows.map((row, rowIndex) => (
                      <div key={rowIndex} className={`space-y-1.5 ${dataRows.length > 1 ? 'border border-gray-200 rounded-lg p-2.5' : ''}`}>
                        {dataRows.length > 1 && (
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-gray-400 font-medium">Label {rowIndex + 1}</span>
                            <button
                              onClick={() => removeRow(rowIndex)}
                              className="text-gray-400 hover:text-red-500 p-0.5"
                              title="Remove label"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                        {fieldNames.map((field) => (
                          <label key={field} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-24 shrink-0 truncate" title={field}>{field}</span>
                            <input
                              type="text"
                              value={row[field] ?? ''}
                              onChange={(e) => updateField(rowIndex, field, e.target.value)}
                              placeholder={field}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addRow}
                    className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <Plus size={12} />
                    Add Label
                  </button>
                </div>
              )}

              {/* Copies */}
              {printers.selectedPrinter && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Copies{hasFields && dataRows.length > 1 ? ' (per label)' : ''}</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              )}

              {/* Status */}
              {jobStatus && (
                <div className={`rounded-lg px-3 py-2 text-xs ${
                  jobStatus === 'completed' ? 'bg-green-50 text-green-700' :
                  jobStatus === 'failed' ? 'bg-red-50 text-red-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {jobStatus === 'queued' && 'Print job queued. Waiting for printer...'}
                  {jobStatus === 'completed' && 'Print job completed successfully.'}
                  {jobStatus === 'failed' && 'Print job failed.'}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            {jobStatus ? 'Close' : 'Cancel'}
          </button>
          {!jobStatus && (
            <button
              onClick={handlePrint}
              disabled={!printers.selectedPrinter || printing}
              className="px-4 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              {printing ? 'Sending...' : dataRows.length > 1 ? `Print ${dataRows.length} Labels` : 'Print'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
