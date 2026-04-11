import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchJson } from '@/lib/client/fetch';
import type { LabelSizeInput } from '@/components/label-sizes/CreateLabelSizeModal';

export interface LabelSize {
  id: string;
  name: string;
  widthDots: number;
  heightDots: number;
  unit: 'in' | 'mm';
  dpi: number;
}

export function useLabelSizes(onChanged: () => void, onClose: () => void) {
  const [sizes, setSizes] = useState<LabelSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchSizes = useCallback(async () => {
    const data = await fetchJson<LabelSize[]>('/api/label-sizes');
    if (data) setSizes(data);
    setLoading(false);
  }, []);

  const initialized = useRef<boolean | null>(null);
  if (initialized.current === null) {
    initialized.current = true;
    fetchSizes();
  }

  const save = async (updated: LabelSize) => {
    const result = await fetchJson('/api/label-sizes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (result) {
      setSizes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditingId(null);
      onChanged();
    }
  };

  const remove = async (id: string) => {
    if (deletingId === id) {
      setSizes((prev) => prev.filter((s) => s.id !== id));
      setDeletingId(null);
      const result = await fetchJson(`/api/label-sizes?id=${id}`, { method: 'DELETE' });
      if (result) onChanged();
      else fetchSizes();
    } else {
      setDeletingId(id);
    }
  };

  const create = async (input: LabelSizeInput) => {
    const result = await fetchJson('/api/label-sizes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!result) return;
    await fetchSizes();
    onChanged();
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
    sizes,
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
