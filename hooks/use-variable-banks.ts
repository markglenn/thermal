import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchJson } from '@/lib/client/fetch';
import type { VariableBank } from '@/lib/types';

export interface VariableBankInput {
  name: string;
  fields: string[];
}

export function useVariableBanks(onClose: () => void) {
  const [banks, setBanks] = useState<VariableBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchBanks = useCallback(async () => {
    const data = await fetchJson<VariableBank[]>('/api/variable-banks');
    if (data) setBanks(data);
    setLoading(false);
  }, []);

  const initialized = useRef<boolean | null>(null);
  if (initialized.current === null) {
    initialized.current = true;
    fetchBanks();
  }

  const save = async (updated: VariableBank) => {
    const result = await fetchJson('/api/variable-banks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (result) {
      setBanks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setEditingId(null);
    }
  };

  const remove = async (id: string) => {
    if (deletingId === id) {
      setBanks((prev) => prev.filter((b) => b.id !== id));
      setDeletingId(null);
      const result = await fetchJson(`/api/variable-banks?id=${id}`, { method: 'DELETE' });
      if (!result) fetchBanks();
    } else {
      setDeletingId(id);
    }
  };

  const create = async (input: VariableBankInput) => {
    const result = await fetchJson('/api/variable-banks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!result) return;
    await fetchBanks();
    setShowCreate(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showCreate) return;
      if (editingId) setEditingId(null);
      else if (deletingId) setDeletingId(null);
      else onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, editingId, deletingId, showCreate]);

  return {
    banks,
    loading,
    editingId,
    setEditingId,
    deletingId,
    setDeletingId,
    showCreate,
    setShowCreate,
    save,
    remove,
    create,
  };
}
