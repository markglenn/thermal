'use client';

import { useState, useRef, useCallback } from 'react';
import { Database } from 'lucide-react';
import { fetchJson } from '@/lib/client/fetch';
import { useEditorStoreContext } from '@/lib/store/editor-context';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { ManageVariableBanksModal } from '../variable-banks/ManageVariableBanksModal';
import type { VariableBank } from '@/lib/types';

function useBankList() {
  const [banks, setBanks] = useState<VariableBank[]>([]);

  const refresh = useCallback(async () => {
    const data = await fetchJson<VariableBank[]>('/api/variable-banks', undefined, { silent: true });
    if (data) setBanks(data);
  }, []);

  const initialized = useRef<boolean | null>(null);
  if (initialized.current === null) {
    initialized.current = true;
    refresh();
  }

  return { banks, refresh };
}

export function VariableBankSelector() {
  const bankId = useEditorStoreContext((s) => s.document.label.variableBankId);
  const updateLabelConfig = useEditorStoreContext((s) => s.updateLabelConfig);
  const { banks, refresh } = useBankList();
  const [showManage, setShowManage] = useState(false);

  return (
    <>
      <CollapsibleSection title="Variable Bank" icon={<Database size={12} />}>
        <div className="px-3 pb-3 space-y-2">
          <select
            value={bankId ?? ''}
            onChange={(e) => updateLabelConfig({ variableBankId: e.target.value || undefined })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
          >
            <option value="">None</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowManage(true)}
            className="text-[10px] text-blue-600 hover:text-blue-800"
          >
            Manage...
          </button>
        </div>
      </CollapsibleSection>

      {showManage && (
        <ManageVariableBanksModal
          onClose={() => { setShowManage(false); refresh(); }}
        />
      )}
    </>
  );
}
