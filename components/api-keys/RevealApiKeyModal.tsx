'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, AlertTriangle } from 'lucide-react';
import type { CreatedApiKey } from '@/hooks/use-api-keys';

interface Props {
  created: CreatedApiKey;
  onClose: () => void;
}

export function RevealApiKeyModal({ created, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be blocked — user can select-and-copy manually.
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[28rem] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
          <h2 className="text-sm font-semibold flex-1">API Key Created</h2>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div>
              Copy this key now. It will never be shown again — if lost, revoke it and create a new one.
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">{created.name} ({created.role})</div>
            <div className="flex gap-1">
              <code className="flex-1 px-2 py-1.5 bg-gray-100 rounded text-xs font-mono break-all select-all">
                {created.secret}
              </code>
              <button
                onClick={copy}
                className="px-2 py-1.5 border border-gray-300 rounded text-xs hover:bg-gray-50 flex items-center gap-1 shrink-0"
              >
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Send this key as a Bearer token:
            <code className="block mt-1 px-2 py-1 bg-gray-50 rounded font-mono text-[11px]">
              Authorization: Bearer {created.secret.slice(0, 18)}…
            </code>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
