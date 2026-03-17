'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';

interface LabelListItem {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  latestVersion: number;
  latestStatus: 'draft' | 'production';
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

export function LabelBrowserModal({ onSelect, onCancel }: Props) {
  const [labels, setLabels] = useState<LabelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLabels = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/labels');
    if (res.ok) {
      setLabels(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const handleDelete = async (id: string) => {
    if (deletingId === id) {
      // Confirmed — optimistically remove, then delete
      setLabels((prev) => prev.filter((l) => l.id !== id));
      setDeletingId(null);
      try {
        const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          // Restore on failure
          fetchLabels();
        }
      } catch {
        fetchLabels();
      }
    } else {
      setDeletingId(id);
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deletingId) {
          setDeletingId(null);
        } else {
          onCancel();
        }
      }
    },
    [onCancel, deletingId]
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Open Label</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
          ) : labels.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              No saved labels yet. Create a label and save it to see it here.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {labels.map((label) => (
                <div
                  key={label.id}
                  className="border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-colors group relative"
                  onClick={() => onSelect(label.id)}
                >
                  <div className="aspect-[4/3] bg-gray-50 rounded mb-2 flex items-center justify-center overflow-hidden">
                    {label.thumbnailUrl ? (
                      <img
                        src={label.thumbnailUrl}
                        alt={label.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-gray-300">No preview</span>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-700 truncate">
                        {label.name}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1.5">
                        <span className={`inline-block px-1 py-0.5 rounded text-[10px] font-medium ${
                          label.latestStatus === 'production'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {label.latestStatus === 'production' ? 'Prod' : 'Draft'} v{label.latestVersion}
                        </span>
                        <span>{relativeTime(label.updatedAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(label.id);
                      }}
                      className={`p-1 rounded transition-colors ${
                        deletingId === label.id
                          ? 'bg-red-100 text-red-600'
                          : 'text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                      }`}
                      title={deletingId === label.id ? 'Click again to confirm' : 'Delete'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
