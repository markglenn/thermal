'use client';

import { Eye, ArrowLeft, FilePlus } from 'lucide-react';
import { useTabStore } from '@/lib/store/tab-store';
import { useEditorStoreContext, useEditorStoreApi } from '@/lib/store/editor-context';
import { captureThumbnail } from '@/lib/documents/thumbnail';
import type { LabelDocument } from '@/lib/types';

export function ReadOnlyBanner() {
  const readOnly = useEditorStoreContext((s) => s.readOnly);
  const storeApi = useEditorStoreApi();
  const activeTabId = useTabStore((s) => s.activeTabId);
  const viewingVersion = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.viewingVersion ?? null;
  });
  const latestStatus = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.latestStatus ?? null;
  });
  const labelId = useTabStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.labelId ?? null;
  });

  if (!readOnly) return null;

  const isViewingOldVersion = viewingVersion !== null;
  const isLatestPublished = latestStatus === 'published' && !isViewingOldVersion;

  const handleReturnToLatest = async () => {
    if (!labelId) return;
    const listRes = await fetch(`/api/labels/${labelId}/versions`);
    if (!listRes.ok) return;
    const versions = await listRes.json();
    if (versions.length === 0) return;

    const latest = versions[0];
    const docRes = await fetch(`/api/labels/${labelId}/versions/${latest.version}`);
    if (!docRes.ok) return;
    const data = await docRes.json();

    useTabStore.getState().returnToLatest(
      activeTabId,
      data.document as LabelDocument,
      latest.version,
      latest.status
    );
  };

  const handleNewVersion = async () => {
    if (!labelId) return;
    const store = storeApi.getState();
    const doc = store.document;
    const thumbnail = await captureThumbnail(doc);

    const res = await fetch(`/api/labels/${labelId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: doc, thumbnail }),
    });
    if (res.ok) {
      const data = await res.json();
      store.setReadOnly(false);
      const tabState = useTabStore.getState();
      tabState.markClean(activeTabId);
      tabState.updateTabVersionMeta(activeTabId, data.version, data.status);
    }
  };

  if (isViewingOldVersion) {
    return (
      <div className="h-8 bg-amber-50 border-b border-amber-200 flex items-center justify-center gap-3 text-xs">
        <Eye size={14} className="text-amber-600" />
        <span className="text-amber-800 font-medium">
          Viewing v{viewingVersion} — Read only
        </span>
        <button
          onClick={handleReturnToLatest}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium"
        >
          <ArrowLeft size={12} />
          Back to latest
        </button>
      </div>
    );
  }

  if (isLatestPublished) {
    return (
      <div className="h-8 bg-blue-50 border-b border-blue-200 flex items-center justify-center gap-3 text-xs">
        <Eye size={14} className="text-blue-600" />
        <span className="text-blue-800 font-medium">
          This version is published — Create a new version to make changes
        </span>
        <button
          onClick={handleNewVersion}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium"
        >
          <FilePlus size={12} />
          New Version
        </button>
      </div>
    );
  }

  return null;
}
