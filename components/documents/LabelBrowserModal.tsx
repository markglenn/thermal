'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Archive, ArchiveRestore, Search } from 'lucide-react';
import { ConfirmButton } from '../ui/ConfirmButton';

interface LabelListItem {
  id: string;
  name: string;
  hasThumbnail: boolean;
  latestVersion: number;
  latestStatus: 'published' | null;
  archivedAt: string | null;
  updatedAt: string;
}

interface Props {
  onSelect: (id: string) => void;
  onCancel: () => void;
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

/** Fuzzy match — checks if all characters in the query appear in order in the target */
function fuzzyMatch(query: string, target: string): { match: boolean; score: number } {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (q.length === 0) return { match: true, score: 0 };

  let qi = 0;
  let score = 0;
  let prevMatchIdx = -2;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Bonus for consecutive matches
      if (ti === prevMatchIdx + 1) score += 2;
      // Bonus for matching at start or after separator
      if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-' || t[ti - 1] === '_') score += 3;
      score += 1;
      prevMatchIdx = ti;
      qi++;
    }
  }

  return { match: qi === q.length, score };
}

export function LabelBrowserModal({ onSelect, onCancel }: Props) {
  const [labels, setLabels] = useState<LabelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [cacheBust] = useState(() => Date.now());

  const fetchLabels = useCallback(async (includeArchived: boolean) => {
    const url = `/api/labels${includeArchived ? '?archived=true' : ''}`;
    const res = await fetch(url);
    if (res.ok) {
      setLabels(await res.json());
    }
    setLoading(false);
  }, []);

  // Kick off initial fetch without triggering synchronous setState in effect
  const initialized = useRef<boolean | null>(null);
  if (initialized.current === null) {
    initialized.current = true;
    fetchLabels(false);
  }

  const handleToggleArchived = (checked: boolean) => {
    setShowArchived(checked);
    fetchLabels(checked);
  };

  const filteredLabels = useMemo(() => {
    if (!search.trim()) {
      return [...labels].sort((a, b) => a.name.localeCompare(b.name));
    }
    return labels
      .map((label) => ({ label, ...fuzzyMatch(search, label.name) }))
      .filter((r) => r.match)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.label);
  }, [labels, search]);

  const handleArchive = async (id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    try {
      const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        fetchLabels(showArchived);
      }
    } catch {
      fetchLabels(showArchived);
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      const res = await fetch(`/api/labels/${id}?unarchive=true`, { method: 'DELETE' });
      if (res.ok) {
        fetchLabels(showArchived);
      }
    } catch {
      fetchLabels(showArchived);
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel]
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-150 max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Open Label</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search labels..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
          ) : labels.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              No saved labels yet. Create a label and save it to see it here.
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              No labels match &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredLabels.map((label) => {
                const isArchived = label.archivedAt !== null;

                return (
                  <div
                    key={label.id}
                    className={`border rounded-lg p-3 transition-colors group relative ${
                      isArchived
                        ? 'border-amber-300 bg-amber-50/60 opacity-70'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                    }`}
                    onClick={() => { if (!isArchived) onSelect(label.id); }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-medium text-gray-700 truncate">{label.name}</span>
                        {isArchived && (
                          <span className="inline-block px-1 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 shrink-0">
                            Archived
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{relativeTime(label.updatedAt)}</span>
                    </div>

                    {/* Thumbnail */}
                    <div className="aspect-4/3 bg-gray-50 rounded mb-2 flex items-center justify-center overflow-hidden">
                      {label.hasThumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/labels/${label.id}/thumbnail?t=${cacheBust}`}
                          alt={label.name}
                          loading="lazy"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-300">No preview</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end min-h-6">
                      {isArchived ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnarchive(label.id);
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <ArchiveRestore size={12} />
                          Restore
                        </button>
                      ) : (
                        <ConfirmButton
                          label="Archive"
                          icon={<Archive size={12} />}
                          onConfirm={() => handleArchive(label.id)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium text-gray-400 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-all"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with archived toggle */}
        <div className="px-4 py-2.5 border-t border-gray-200">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => handleToggleArchived(e.target.checked)}
              className="rounded border-gray-300"
            />
            Include archived labels
          </label>
        </div>
      </div>
    </div>,
    document.body
  );
}
