'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Circle, MapPin, AlertCircle, Plus, Minus, Trash2, ChevronDown, Search, RefreshCw, ClipboardPaste, Upload, Download } from 'lucide-react';
import { usePrinters } from '@/hooks/use-printers';
import { fetchJson } from '@/lib/client/fetch';
import { toast } from '@/lib/toast-store';
import type { LabelDocument } from '@/lib/types';
import type { Site, Printer as PrinterInfo } from '@/hooks/use-printers';

interface Props {
  labelId?: string;
  labelName?: string;
  document: LabelDocument;
  onClose: () => void;
}

const stateColor: Record<string, string> = {
  idle: 'text-green-500',
  processing: 'text-yellow-500',
  stopped: 'text-red-500',
  unknown: 'text-gray-400',
};

function PrinterRow({ printer, selected, onSelect }: {
  printer: PrinterInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left pl-6 pr-2 py-1.5 rounded-md transition-colors ${
        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      {selected && (
        <span className="absolute left-2 top-1.5 bottom-1.5 w-0.5 bg-blue-500 rounded-full" />
      )}
      <div className="flex items-center gap-2">
        <Circle size={7} className={`fill-current ${stateColor[printer.stateLabel]}`} />
        <span className={`text-sm ${selected ? 'font-medium text-blue-900' : 'text-gray-800'}`}>
          {printer.name}
        </span>
      </div>
      {(printer.location || printer.info || printer.mediaDefault) && (
        <div className="mt-0.5 ml-[22px] flex items-center gap-2 text-[11px] text-gray-400">
          {printer.location && (
            <span className="flex items-center gap-0.5">
              <MapPin size={10} />
              {printer.location}
            </span>
          )}
          {printer.info && <span className="truncate">{printer.info}</span>}
          {printer.mediaDefault && <span className="truncate">{printer.mediaDefault}</span>}
        </div>
      )}
    </button>
  );
}

/**
 * Subsequence match: every character of `needle` appears in `haystack`
 * in order, with anything allowed between. Whitespace in the needle is
 * ignored so "Zeb 2" also matches "Zebra-2x1".
 */
function fuzzyMatch(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().replace(/\s+/g, '');
  if (n.length === 0) return true;
  let hi = 0;
  for (let i = 0; i < n.length; i++) {
    const ch = n.charCodeAt(i);
    while (hi < h.length && h.charCodeAt(hi) !== ch) hi++;
    if (hi === h.length) return false;
    hi++;
  }
  return true;
}

function matchesQuery(haystacks: (string | null | undefined)[], q: string): boolean {
  return haystacks.some((h) => h !== null && h !== undefined && fuzzyMatch(h, q));
}

function CopiesStepper({ value, onChange, min = 1, max = 1000 }: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="inline-flex items-stretch border border-gray-200 rounded-md bg-gray-50 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease copies"
        className="px-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <Minus size={13} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          if (raw === '') { onChange(min); return; }
          const n = parseInt(raw, 10);
          onChange(Math.min(max, Math.max(min, n)));
        }}
        className="w-10 text-center text-sm bg-transparent py-1 focus:outline-none focus:bg-white tabular-nums"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase copies"
        className="px-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

interface SitePickerProps {
  sites: Site[];
  selectedSiteId: string | null;
  selectedPrinter: string | null;
  onSelect: (siteId: string, printerName: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

function SitePicker({ sites, selectedSiteId, selectedPrinter, onSelect, onRefresh, refreshing }: SitePickerProps) {
  const [query, setQuery] = useState('');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;
  const isSingleSite = sites.length === 1;

  const results = useMemo(() => {
    return sites.map((site) => {
      const siteMatches = !isSearching || matchesQuery([site.siteName, site.siteId], q);
      const filtered = (!isSearching || siteMatches)
        ? site.printers
        : site.printers.filter((p) => matchesQuery([p.name, p.location, p.info, p.mediaDefault], q));
      return { site, filtered, siteMatches };
    }).filter(({ filtered, siteMatches }) => !isSearching || siteMatches || filtered.length > 0);
  }, [sites, q, isSearching]);

  const isExpanded = (siteId: string): boolean => {
    if (isSearching || isSingleSite) return true;
    if (siteId in overrides) return overrides[siteId];
    return siteId === selectedSiteId;
  };

  const toggle = (siteId: string) => {
    if (isSearching || isSingleSite) return;
    setOverrides((prev) => ({ ...prev, [siteId]: !isExpanded(siteId) }));
  };

  return (
    <div>
      <div className="sticky top-0 z-10 bg-white -mx-4 px-4 pt-px pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search printers or facilities..."
            className="w-full pl-8 pr-9 py-1.5 border border-gray-200 rounded-md text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh facilities and printers"
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center text-xs text-gray-400 py-6">
          No printers match &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <div>
          {results.map(({ site, filtered }) => {
            const expanded = isExpanded(site.siteId);
            const containsSelected = selectedSiteId === site.siteId && selectedPrinter !== null;

            return (
              <div key={site.siteId}>
                <button
                  type="button"
                  onClick={() => toggle(site.siteId)}
                  disabled={isSingleSite || isSearching}
                  className={`sticky top-[47px] z-[5] w-full flex items-center gap-1.5 px-2 py-2 bg-gray-50 border-b border-gray-100 rounded-md text-left ${
                    isSingleSite || isSearching ? 'cursor-default' : 'hover:bg-gray-100'
                  }`}
                >
                  {!isSingleSite && (
                    <ChevronDown
                      size={14}
                      className={`text-gray-400 transition-transform ${expanded ? '' : '-rotate-90'}`}
                    />
                  )}
                  <span className={`text-sm font-medium flex-1 truncate ${isSingleSite ? 'ml-0.5' : ''}`}>
                    {site.siteName}
                  </span>
                  {containsSelected && !expanded && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-label="selected printer in this site" />
                  )}
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {isSearching && filtered.length !== site.printers.length
                      ? `${filtered.length} / ${site.printers.length}`
                      : site.printers.length}
                  </span>
                </button>

                {expanded && (
                  <div className="pb-2 space-y-px">
                    {filtered.length === 0 ? (
                      <div className="text-xs text-gray-400 py-2 pl-6">No printers at this site</div>
                    ) : (
                      filtered.map((p) => (
                        <PrinterRow
                          key={p.name}
                          printer={p}
                          selected={selectedSiteId === site.siteId && selectedPrinter === p.name}
                          onSelect={() => onSelect(site.siteId, p.name)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ParsedPaste {
  rows: Record<string, string>[];
  matchedCols: number;
  totalCols: number;
  unknownHeaders: string[];
}

/**
 * Parse clipboard text (TSV from Excel, or CSV) into data rows.
 *
 * Requires a header line whose cells match variable names (case-insensitive).
 * Unknown headers are dropped; missing fields are filled with empty strings.
 * Returns null if the text is unparseable or no headers match.
 */
function parseClipboardRows(text: string, fieldNames: string[]): ParsedPaste | null {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length > 0);
  if (lines.length < 2) return null;

  const delim = lines[0].includes('\t') ? '\t' : ',';
  const parse = (line: string) => line.split(delim).map((s) => s.trim());

  const headers = parse(lines[0]);
  const fieldByLower = new Map(fieldNames.map((f) => [f.toLowerCase(), f]));
  const colToField = headers.map((h) => fieldByLower.get(h.toLowerCase()) ?? null);
  const matchedCols = colToField.filter((f) => f !== null).length;
  if (matchedCols === 0) return null;

  const unknownHeaders = headers.filter((h, i) => colToField[i] === null && h.length > 0);

  const rows = lines.slice(1).map((line) => {
    const cells = parse(line);
    const row: Record<string, string> = {};
    for (const f of fieldNames) row[f] = '';
    colToField.forEach((field, i) => {
      if (field) row[field] = cells[i] ?? '';
    });
    return row;
  });

  return { rows, matchedCols, totalCols: headers.length, unknownHeaders };
}

function extractFieldNames(doc: LabelDocument): string[] {
  const names = new Set<string>();
  for (const comp of doc.components) {
    if (comp.fieldBinding) names.add(comp.fieldBinding);
  }
  // Include required variables even if not bound to a component (e.g. RFID-only)
  for (const v of doc.variables ?? []) {
    if (v.required) names.add(v.name);
  }
  return Array.from(names);
}

function extractRequiredFields(doc: LabelDocument): Set<string> {
  const required = new Set<string>();
  for (const v of doc.variables ?? []) {
    if (v.required) required.add(v.name);
  }
  return required;
}

export function PrintDialog({ labelId, labelName, document: doc, onClose }: Props) {
  const printers = usePrinters();
  const fieldNames = useMemo(() => extractFieldNames(doc), [doc]);
  const requiredFields = useMemo(() => extractRequiredFields(doc), [doc]);
  const hasFields = fieldNames.length > 0;

  const makeEmptyRow = () => Object.fromEntries(fieldNames.map((f) => [f, '']));
  const [dataRows, setDataRows] = useState<Record<string, string>[]>(() =>
    hasFields ? [makeEmptyRow()] : [{}]
  );

  const [copies, setCopies] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const missingByRow = useMemo(() => {
    return dataRows.map((row) => {
      const missing = new Set<string>();
      for (const field of requiredFields) {
        if (!(row[field] ?? '').trim()) missing.add(field);
      }
      return missing;
    });
  }, [dataRows, requiredFields]);

  const hasMissing = missingByRow.some((m) => m.size > 0);

  const updateField = (rowIndex: number, field: string, value: string) => {
    setDataRows((prev) => prev.map((row, i) =>
      i === rowIndex ? { ...row, [field]: value } : row
    ));
  };

  const addRow = () => setDataRows((prev) => [...prev, makeEmptyRow()]);

  const removeRow = (index: number) => {
    setDataRows((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyImport = (text: string, source: 'paste' | 'upload') => {
    const result = parseClipboardRows(text, fieldNames);
    if (!result) {
      const msg = source === 'paste'
        ? 'Include a header row matching variable names (paste from Excel with headers).'
        : 'CSV headers didn\'t match any variable names.';
      toast(msg, 'error');
      return;
    }
    setDataRows(result.rows);
    setShowErrors(false);
    const suffix = result.unknownHeaders.length > 0
      ? ` (ignored: ${result.unknownHeaders.slice(0, 3).join(', ')}${result.unknownHeaders.length > 3 ? '…' : ''})`
      : '';
    toast(
      `Imported ${result.rows.length} ${result.rows.length === 1 ? 'label' : 'labels'}${suffix}`,
      'success',
    );
  };

  const handlePaste = async () => {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toast('Could not read clipboard — grant clipboard permission and try again.', 'error');
      return;
    }
    if (!text.trim()) {
      toast('Clipboard is empty.', 'error');
      return;
    }
    applyImport(text, 'paste');
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleUploadCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      applyImport(text, 'upload');
    } catch {
      toast('Could not read the selected file.', 'error');
    } finally {
      // Reset so the same file can be re-selected later
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const csvEscape = (v: string) =>
      /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = fieldNames.map(csvEscape).join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = (labelName || 'label').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'label';
    a.href = url;
    a.download = `${base}-template.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Poll for job completion
  useEffect(() => {
    if (!jobId || jobStatus === 'completed' || jobStatus === 'failed') return;

    let stopped = false;
    const poll = async () => {
      while (!stopped) {
        // SQS long-poll blocks server-side until a message arrives (up to WaitTimeSeconds),
        // so no client-side sleep needed — responses come back immediately when events arrive
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
      }
    };
    poll();

    return () => { stopped = true; };
  }, [jobId, jobStatus]);

  const handlePrint = async () => {
    if (!printers.selectedSite || !printers.selectedPrinter) return;
    if (hasMissing) {
      setShowErrors(true);
      return;
    }

    // Reset prior job state so a repeat print doesn't inherit stale status
    setJobId(null);
    setJobStatus(null);
    setPrinting(true);
    const result = await fetchJson<{ jobId: string }>('/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: doc,
        data: dataRows,
        printer: printers.selectedPrinter,
        siteId: printers.selectedSite.siteId,
        copies,
        ...(labelId && { labelId }),
        ...(labelName && { labelName }),
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
      <div className={`bg-white rounded-lg shadow-xl max-h-[85vh] flex flex-col overflow-hidden ${hasFields ? 'w-[880px] max-w-[92vw]' : 'w-96'}`}>
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Printer size={14} />
            Print
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>

        {printers.loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 py-12">
            Loading printers...
          </div>
        ) : printers.sites.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center">
            <AlertCircle size={24} className="text-gray-300" />
            <p className="text-sm text-gray-400">No print servers found</p>
            <p className="text-xs text-gray-400">Make sure the print server is running and has published its manifest.</p>
          </div>
        ) : hasFields ? (
          /* Two-column: printer picker on the left, data + copies on the right */
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-[320px] flex-shrink-0 border-r border-gray-200 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <SitePicker
                sites={printers.sites}
                selectedSiteId={printers.selectedSiteId}
                selectedPrinter={printers.selectedPrinter}
                onSelect={printers.selectPrinter}
                onRefresh={() => printers.refresh(true)}
                refreshing={printers.loading}
              />
            </aside>

            <div className="flex-1 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {!printers.selectedPrinter ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 text-center px-6">
                  Select a printer to enter label data.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between mb-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        Data
                        {dataRows.length > 1 && (
                          <span className="ml-1.5 normal-case font-normal tracking-normal text-gray-400">
                            · {dataRows.length} labels
                          </span>
                        )}
                      </span>
                      {requiredFields.size > 0 && (
                        <span className="text-[11px] text-gray-400">
                          <span className="text-red-500">*</span> required
                        </span>
                      )}
                    </div>

                    {dataRows.length === 1 ? (
                      /* Single-label: labels above inputs, clean vertical stack */
                      <div className="space-y-2.5">
                        {fieldNames.map((field) => {
                          const isRequired = requiredFields.has(field);
                          const isInvalid = showErrors && missingByRow[0]?.has(field);
                          return (
                            <label key={field} className="block">
                              <span className="text-xs text-gray-600 block mb-1 font-mono">
                                {field}
                                {isRequired && <span className="text-red-500 ml-0.5 font-sans">*</span>}
                              </span>
                              <input
                                type="text"
                                value={dataRows[0][field] ?? ''}
                                onChange={(e) => updateField(0, field, e.target.value)}
                                className={`w-full px-2.5 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 ${
                                  isInvalid ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                }`}
                              />
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      /* Batch: compact rows, labels-beside-input, wider label column */
                      <div className="space-y-2">
                        {dataRows.map((row, rowIndex) => (
                          <div key={rowIndex} className="border border-gray-200 rounded-lg p-3 space-y-1.5">
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
                            {fieldNames.map((field) => {
                              const isRequired = requiredFields.has(field);
                              const isInvalid = showErrors && missingByRow[rowIndex]?.has(field);
                              return (
                                <label key={field} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 font-mono w-44 shrink-0 truncate" title={field}>
                                    {field}
                                    {isRequired && <span className="text-red-500 ml-0.5 font-sans">*</span>}
                                  </span>
                                  <input
                                    type="text"
                                    value={row[field] ?? ''}
                                    onChange={(e) => updateField(rowIndex, field, e.target.value)}
                                    className={`flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 ${
                                      isInvalid ? 'border-red-400 bg-red-50' : 'border-gray-300'
                                    }`}
                                  />
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-4 flex-wrap">
                      <button
                        onClick={addRow}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <Plus size={12} />
                        Add Label
                      </button>
                      <button
                        onClick={handlePaste}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        title="Paste TSV/CSV from Excel — first row should be variable names"
                      >
                        <ClipboardPaste size={12} />
                        Paste from Excel
                      </button>
                      <button
                        onClick={handleUploadClick}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        title="Upload a CSV file with variable names as headers"
                      >
                        <Upload size={12} />
                        Upload CSV
                      </button>
                      <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 ml-auto"
                        title="Download a CSV template with variable names as headers"
                      >
                        <Download size={12} />
                        Template
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                        hidden
                        onChange={handleUploadCsv}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="text-xs text-gray-500">
                      Copies{dataRows.length > 1 ? ' (per label)' : ''}
                    </label>
                    <CopiesStepper value={copies} onChange={setCopies} />
                  </div>

                  {showErrors && hasMissing && !jobStatus && (
                    <div className="rounded-lg px-3 py-2 text-xs bg-red-50 text-red-700 flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      Fill in all required fields before printing.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Single-column (no variable fields): printer picker + copies */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <SitePicker
              sites={printers.sites}
              selectedSiteId={printers.selectedSiteId}
              selectedPrinter={printers.selectedPrinter}
              onSelect={printers.selectPrinter}
              onRefresh={() => printers.refresh(true)}
              refreshing={printers.loading}
            />
            {printers.selectedPrinter && (
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500">Copies</label>
                <CopiesStepper value={copies} onChange={setCopies} />
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2">
          {jobStatus && (
            <span className={`text-xs truncate flex-1 ${
              jobStatus === 'completed' ? 'text-green-700' :
              jobStatus === 'failed' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {jobStatus === 'queued' && 'Print job queued. Waiting for printer...'}
              {jobStatus === 'completed' && 'Print job completed successfully.'}
              {jobStatus === 'failed' && 'Print job failed.'}
            </span>
          )}
          <div className={`flex gap-2 ${jobStatus ? '' : 'ml-auto'}`}>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              {jobStatus ? 'Close' : 'Cancel'}
            </button>
            {jobStatus !== 'queued' && (
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
      </div>
    </div>,
    document.body
  );
}
