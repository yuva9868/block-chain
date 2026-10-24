import { appendAudit } from './audit';
import { onChainHasAccess, readOnChainRecord } from './chain';
import { getDb, isGrantActive, type StoredRecord } from './store';
import type { Session } from './auth';

export async function findRecord(recordId: string) {
  const db = await getDb();
  return db.records.find((r) => r.id.toLowerCase() === recordId.toLowerCase()) || null;
}

export async function authorizeRecord(
  session: Session,
  record: StoredRecord,
  options: { requireFile?: boolean } = {}
) {
  const actor = session.address.toLowerCase();
  const owner = record.ownerAddress.toLowerCase();

  if (session.role === 'patient') {
    if (actor !== owner) {
      await appendAudit({
        action: 'unauthorized_access_attempt',
        actor,
        recordId: record.id,
        source: 'off-chain',
        details: 'patient_not_owner',
      });
      throw Object.assign(new Error('You do not own this record'), { status: 403 });
    }
    return { chainAvailable: true, onChainAccess: true };
  }

  if (!isGrantActive(record, actor)) {
    await appendAudit({
      action: 'unauthorized_access_attempt',
      actor,
      recordId: record.id,
      source: 'off-chain',
      details: 'no_active_offchain_grant',
    });
    throw Object.assign(new Error('Access denied. Consent is not currently granted.'), { status: 403 });
  }

  try {
    const chainRecord = await readOnChainRecord(record.id);
    if (!chainRecord.exists || chainRecord.owner !== owner) {
      throw Object.assign(new Error('On-chain record does not match the stored record'), { status: 403 });
    }
    const allowed = await onChainHasAccess(record.id, actor);
    if (!allowed) {
      await appendAudit({
        action: 'unauthorized_access_attempt',
        actor,
        recordId: record.id,
        source: 'on-chain',
        details: 'onchain_hasAccess_false',
      });
      throw Object.assign(new Error('Access denied by the smart contract consent state.'), { status: 403 });
    }
    return { chainAvailable: true, onChainAccess: true };
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 0;
    if (status === 403) throw error;
    if (options.requireFile) {
      throw Object.assign(new Error('Blockchain RPC is unavailable. File access is denied until consent can be verified on-chain.'), {
        status: 503,
      });
    }
    return { chainAvailable: false, onChainAccess: false };
  }
}
