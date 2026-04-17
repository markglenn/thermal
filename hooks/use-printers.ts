import { useState, useCallback, useRef } from 'react';
import { fetchJson } from '@/lib/client/fetch';

export interface Printer {
  name: string;
  state: number | null;
  stateLabel: string;
  info: string | null;
  location: string | null;
  dpi: number | null;
  mediaDefault: string | null;
  mediaReady: string[] | null;
}

export interface Site {
  siteId: string;
  siteName: string;
  queueUrl: string;
  updatedAt: string;
  printers: Printer[];
}

interface PrintersResponse {
  sites: Site[];
}

const LAST_PRINTER_KEY = 'thermal:lastPrinter';

function loadLastPrinter(): { siteId: string; printer: string } | null {
  try {
    const raw = localStorage.getItem(LAST_PRINTER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLastPrinter(siteId: string, printer: string) {
  try {
    localStorage.setItem(LAST_PRINTER_KEY, JSON.stringify({ siteId, printer }));
  } catch { /* ignore */ }
}

export function usePrinters() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);

  const fetch_ = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    const url = forceRefresh ? '/api/printers?refresh=1' : '/api/printers';
    const data = await fetchJson<PrintersResponse>(url);
    if (data) {
      setSites(data.sites);

      // Restore last-used printer if it still exists
      const last = loadLastPrinter();
      if (last) {
        const site = data.sites.find((s) => s.siteId === last.siteId);
        if (site?.printers.some((p) => p.name === last.printer)) {
          setSelectedSiteId(last.siteId);
          setSelectedPrinter(last.printer);
        }
      }

      // Auto-select if only one site
      if (!last && data.sites.length === 1) {
        setSelectedSiteId(data.sites[0].siteId);
      }
    }
    setLoading(false);
  }, []);

  const initialized = useRef<boolean | null>(null);
  if (initialized.current === null) {
    initialized.current = true;
    fetch_();
  }

  const selectPrinter = (siteId: string, printerName: string) => {
    setSelectedSiteId(siteId);
    setSelectedPrinter(printerName);
    saveLastPrinter(siteId, printerName);
  };

  const selectedSite = sites.find((s) => s.siteId === selectedSiteId) ?? null;

  return {
    sites,
    loading,
    selectedSiteId,
    setSelectedSiteId,
    selectedPrinter,
    selectedSite,
    selectPrinter,
    refresh: fetch_,
  };
}
