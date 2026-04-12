import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/client/fetch';
import type { VariableBank } from '@/lib/types';

const EMPTY: string[] = [];

/**
 * Fetches the selected variable bank's fields by ID.
 * Returns [] for undefined/unknown ID. Re-fetches on bankId change.
 */
export function useVariableBankFields(bankId: string | undefined): string[] {
  const [fieldsByBankId, setFieldsByBankId] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!bankId) return;

    let cancelled = false;
    fetchJson<VariableBank[]>('/api/variable-banks', undefined, { silent: true }).then((banks) => {
      if (cancelled) return;
      const bank = banks?.find((b) => b.id === bankId);
      setFieldsByBankId((prev) => ({ ...prev, [bankId]: bank?.fields ?? EMPTY }));
    });

    return () => { cancelled = true; };
  }, [bankId]);

  if (!bankId) return EMPTY;
  return fieldsByBankId[bankId] ?? EMPTY;
}
