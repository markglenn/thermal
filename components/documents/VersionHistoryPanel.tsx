'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, ShieldOff, Archive, ArchiveRestore, Clock } from 'lucide-react';
import { ConfirmButton } from '../ui/ConfirmButton';
import { LabelThumbnail, formatSize } from '../ui/LabelThumbnail';
import { useVersionHistory } from '@/hooks/use-version-history';

interface Props {
  labelId: string | null;
  currentThumbnail: string | null;
  currentLabelSize: { widthInches: number; heightInches: number } | null;
  onClose: () => void;
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

export function VersionHistoryPanel({ labelId, currentThumbnail, currentLabelSize, onClose }: Props) {
  const {
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
  } = useVersionHistory(labelId, onClose);

  const [cacheBust] = useState(() => Date.now());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-white rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <Clock size={14} />
            Version History
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
          ) : !labelId ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-blue-400 bg-blue-50/50 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm font-medium">Draft</span>
                  <span className="text-[10px] text-gray-400 font-medium">Unsaved</span>
                </div>
                <LabelThumbnail
                  src={currentThumbnail}
                  alt="Draft"
                  widthInches={currentLabelSize?.widthInches ?? null}
                  heightInches={currentLabelSize?.heightInches ?? null}
                />
              </div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">No versions saved yet</div>
          ) : (
            <div className="flex flex-col gap-3">
              {!versions.some((v) => v.status === 'published') && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 text-center">
                  No version has been published
                </div>
              )}
              {versions.map((v) => {
                const isLatest = v.version === latestVersion;
                const isViewing = v.version === viewingVersion;
                const isCurrent = isLatest && viewingVersion === null && v.version === tabLatestVersion;
                const isPublished = v.status === 'published';
                const isArchived = v.archivedAt !== null;
                const canClick = !isCurrent;

                return (
                  <div
                    key={v.id}
                    className={`rounded-lg border p-3 transition-colors group relative ${
                      isArchived
                        ? 'border-amber-300 bg-amber-50/60 opacity-70'
                        : isViewing || isCurrent
                          ? 'border-blue-400 bg-blue-50/50'
                          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (canClick && !isArchived) selectVersion(v.version, isLatest);
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">v{v.version}</span>
                        {isPublished && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                            Published
                          </span>
                        )}
                        {isArchived && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                            Archived
                          </span>
                        )}
                        {isLatest && (
                          <span className="text-[10px] text-gray-400 font-medium">Latest</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400" title={`Created ${new Date(v.createdAt).toLocaleString()}${v.updatedAt ? `\nEdited ${new Date(v.updatedAt).toLocaleString()}` : ''}`}>
                        {v.updatedAt ? `edited ${relativeTime(v.updatedAt)}` : relativeTime(v.createdAt)}
                      </span>
                    </div>

                    {/* Thumbnail */}
                    <LabelThumbnail
                      src={v.hasThumbnail ? `/api/labels/${labelId}/versions/${v.version}/thumbnail?t=${cacheBust}` : null}
                      alt={`v${v.version}`}
                      widthInches={null}
                      heightInches={null}
                    />

                    {/* Size + Actions */}
                    <div className="flex items-center justify-between min-h-6">
                      {v.widthInches != null && v.heightInches != null ? (
                        <span className="text-[10px] text-gray-400">{formatSize(v.widthInches, v.heightInches)}</span>
                      ) : <span />}
                      <div className="flex items-center gap-1.5">
                        {/* Publish */}
                        {!isPublished && !isArchived && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPublished(v.version, true); }}
                            disabled={busy}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ShieldCheck size={12} />
                            Publish
                          </button>
                        )}

                        {/* Unpublish — only if single version */}
                        {isPublished && versions.length === 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPublished(v.version, false); }}
                            disabled={busy}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ShieldOff size={12} />
                            Unpublish
                          </button>
                        )}

                        {/* Archive — non-published versions only */}
                        {!isPublished && !isArchived && (
                          <ConfirmButton
                            label="Archive"
                            icon={<Archive size={12} />}
                            onConfirm={() => setArchived(v.version, true)}
                            disabled={busy}
                          />
                        )}

                        {/* Unarchive */}
                        {isArchived && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setArchived(v.version, false); }}
                            disabled={busy}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ArchiveRestore size={12} />
                            Unarchive
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with archived toggle */}
        {labelId && (
          <div className="px-4 py-2.5 border-t border-gray-200">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => toggleArchived(e.target.checked)}
                className="rounded border-gray-300"
              />
              Include archived versions
            </label>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
