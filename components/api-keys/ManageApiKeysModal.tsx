'use client';

import { createPortal } from 'react-dom';
import { Trash2, Plus } from 'lucide-react';
import { useApiKeys } from '@/hooks/use-api-keys';
import { CreateApiKeyModal } from './CreateApiKeyModal';
import { RevealApiKeyModal } from './RevealApiKeyModal';

interface Props {
  onClose: () => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ManageApiKeysModal({ onClose }: Props) {
  const ak = useApiKeys(onClose);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-[48rem] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Manage API Keys</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4">
          {ak.loading ? (
            <div className="text-center text-sm text-gray-400 py-8">Loading...</div>
          ) : ak.keys.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              No API keys yet. Create one to let an external service authenticate without a browser session.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-4 pb-2 font-medium">Name</th>
                  <th className="px-4 pb-2 font-medium">Prefix</th>
                  <th className="px-4 pb-2 font-medium">Role</th>
                  <th className="px-4 pb-2 font-medium">Created</th>
                  <th className="px-4 pb-2 font-medium">Last used</th>
                  <th className="px-4 pb-2 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {ak.keys.map((k) => (
                  <tr key={k.id} className="border-t border-gray-100 hover:bg-gray-50 group">
                    <td className="px-4 py-3 font-medium">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">thrml_{k.prefix}…</td>
                    <td className="px-4 py-3 text-gray-600">{k.role}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(k.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(k.lastUsedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => ak.revoke(k.id)}
                          className={`p-1 rounded transition-colors ${
                            ak.revokingId === k.id
                              ? 'bg-red-100 text-red-600'
                              : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                          }`}
                          title={ak.revokingId === k.id ? 'Click again to revoke permanently' : 'Revoke'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => ak.setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
          >
            <Plus size={14} />
            New Key
          </button>
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded">
            Done
          </button>
        </div>
      </div>

      {ak.showCreate && (
        <CreateApiKeyModal
          onConfirm={ak.create}
          onCancel={() => ak.setShowCreate(false)}
        />
      )}

      {ak.justCreated && (
        <RevealApiKeyModal
          created={ak.justCreated}
          onClose={() => ak.setJustCreated(null)}
        />
      )}
    </div>,
    document.body
  );
}
