import { useState, useCallback, useEffect } from 'react';
import { useTabStore } from '@/lib/store/tab-store';
import { fetchJson } from '@/lib/client/fetch';
import type { LabelDocument, VersionStatus } from '@/lib/types';

export interface VersionEntry {
  id: string;
  version: number;
  status: VersionStatus;
  hasThumbnail: boolean;
  widthInches: number | null;
  heightInches: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export function useVersionHistory(labelId: string | null, onClose: () => void) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const activeTabId = useTabStore((s) => s.activeTabId);
  const viewingVersion = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.viewingVersion ?? null;
  });
  const tabLatestVersion = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.latestVersion ?? null;
  });

  const fetchVersions = useCallback(async (includeArchived: boolean) => {
    if (!labelId) {
      setLoading(false);
      return;
    }
    const url = `/api/labels/${labelId}/versions${includeArchived ? '?archived=true' : ''}`;
    const data = await fetchJson<VersionEntry[]>(url);
    if (data) setVersions(data);
    setLoading(false);
  }, [labelId]);

  useEffect(() => {
    fetchVersions(false);
  }, [fetchVersions]);

  const toggleArchived = (checked: boolean) => {
    setShowArchived(checked);
    fetchVersions(checked);
  };

  const selectVersion = async (version: number, isLatest: boolean) => {
    if (!labelId) return;
    const tabState = useTabStore.getState();
    const tab = tabState.tabs.find((t) => t.id === activeTabId);
    if (tab?.dirty) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }

    const data = await fetchJson<{ name: string; document: unknown; status: VersionStatus }>(`/api/labels/${labelId}/versions/${version}`);
    if (!data) return;

    if (isLatest) {
      useTabStore.getState().returnToLatest(
        activeTabId,
        data.document as LabelDocument,
        version,
        data.status
      );
    } else {
      const latestVersion = versions[0]?.version ?? version;
      useTabStore.getState().openLabelVersion(
        labelId,
        data.name,
        data.document as LabelDocument,
        version,
        latestVersion,
        data.status
      );
    }

    onClose();
  };

  const setPublished = async (version: number, production: boolean) => {
    setBusy(true);
    try {
      const result = await fetchJson(`/api/labels/${labelId}/versions/${version}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ production }),
      });
      if (!result) return;

      await fetchVersions(showArchived);

      const tabState = useTabStore.getState();
      const tab = tabState.tabs.find((t) => t.id === activeTabId);
      if (tab) {
        const latestData = await fetchJson<{ version: number; status: VersionStatus }>(`/api/labels/${labelId}`);
        if (latestData) {
          tabState.updateTabVersionMeta(activeTabId, latestData.version, latestData.status);
          if (viewingVersion === null) {
            tab.store.getState().setReadOnly(latestData.status === 'published');
          }
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const setArchived = async (version: number, archived: boolean) => {
    setBusy(true);
    try {
      const result = await fetchJson(`/api/labels/${labelId}/versions/${version}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      });
      if (!result) return;

      await fetchVersions(showArchived);

      if (archived) {
        const latestVersion = versions[0]?.version ?? null;
        const isCurrentVersion =
          (viewingVersion === null && version === latestVersion) ||
          viewingVersion === version;

        if (isCurrentVersion) {
          const allVersions = await fetchJson<VersionEntry[]>(`/api/labels/${labelId}/versions`);
          const fallback = allVersions?.[0];
          if (fallback) {
            const data = await fetchJson<{ document: unknown; status: VersionStatus }>(`/api/labels/${labelId}/versions/${fallback.version}`);
            if (data) {
              const tabState = useTabStore.getState();
              tabState.returnToLatest(activeTabId, data.document as LabelDocument, fallback.version, fallback.status);
              tabState.updateTabVersionMeta(activeTabId, fallback.version, fallback.status);
            }
          }
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const latestVersion = versions[0]?.version ?? null;

  return {
    versions,
    loading,
    busy,
    showArchived,
    latestVersion,
    viewingVersion,
    tabLatestVersion,
    toggleArchived,
    selectVersion,
    setPublished,
    setArchived,
  };
}
