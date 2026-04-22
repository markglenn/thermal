import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchJson } from '@/lib/client/fetch';
import type { Role } from '@/lib/auth/roles';

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  role: Role;
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreatedApiKey extends ApiKeyRow {
  /** Full key — only present on the create response, never listable. */
  secret: string;
}

export interface NewApiKeyInput {
  name: string;
  role: Role;
}

export function useApiKeys(onClose: () => void) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [justCreated, setJustCreated] = useState<CreatedApiKey | null>(null);

  const fetchKeys = useCallback(async () => {
    const data = await fetchJson<ApiKeyRow[]>('/api/api-keys');
    if (data) setKeys(data);
    setLoading(false);
  }, []);

  const initialized = useRef<boolean | null>(null);
  if (initialized.current === null) {
    initialized.current = true;
    fetchKeys();
  }

  const create = async (input: NewApiKeyInput) => {
    const result = await fetchJson<CreatedApiKey>('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!result) return;
    setJustCreated(result);
    setShowCreate(false);
    await fetchKeys();
  };

  const revoke = async (id: string) => {
    if (revokingId === id) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setRevokingId(null);
      const result = await fetchJson(`/api/api-keys/${id}`, { method: 'DELETE' });
      if (!result) fetchKeys();
    } else {
      setRevokingId(id);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showCreate || justCreated) return;
      if (revokingId) setRevokingId(null);
      else onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, revokingId, showCreate, justCreated]);

  return {
    keys,
    loading,
    revokingId,
    setRevokingId,
    showCreate,
    setShowCreate,
    justCreated,
    setJustCreated,
    create,
    revoke,
  };
}
