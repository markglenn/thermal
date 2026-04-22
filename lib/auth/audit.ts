import { getDatabase } from '@/lib/db';
import type { AuthSession } from './require-role';

export type AuditAction =
  | 'label.created'
  | 'label.updated'
  | 'label.renamed'
  | 'label.archived'
  | 'label.unarchived'
  | 'label.version_created'
  | 'label.version_published'
  | 'label.version_unpublished'
  | 'label.version_archived'
  | 'label.printed'
  | 'label.imported'
  | 'label_size.created'
  | 'label_size.updated'
  | 'label_size.deleted'
  | 'variable_bank.created'
  | 'variable_bank.updated'
  | 'variable_bank.deleted'
  | 'api_key.created'
  | 'api_key.revoked';

/**
 * Log an audit event. Fire-and-forget — errors are logged but don't propagate.
 */
export async function logAudit(
  session: AuthSession,
  action: AuditAction,
  targetId?: string,
  detail?: Record<string, unknown>
): Promise<void> {
  try {
    const { db, tables } = await getDatabase();
    await db.insert(tables.auditEvents).values({
      id: crypto.randomUUID(),
      userId: session.user.sub,
      userEmail: session.user.email ?? null,
      action,
      targetId: targetId ?? null,
      detail: detail ?? null,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error('Failed to write audit event:', e);
  }
}
