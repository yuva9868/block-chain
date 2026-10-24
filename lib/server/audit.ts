import { randomId, sha256String } from './crypto';
import { mutateDb, type AuditEntry, type AuditSource } from './store';

export async function appendAudit(input: {
  action: string;
  actor: string;
  recordId?: string;
  source: AuditSource;
  txHash?: string;
  details: string;
}) {
  return mutateDb((db) => {
    const prevHash = db.audit.length ? db.audit[db.audit.length - 1].entryHash : '0'.repeat(64);
    const timestamp = Date.now();
    const id = randomId();
    const material = [
      prevHash,
      String(timestamp),
      input.action,
      input.actor.toLowerCase(),
      input.recordId || '',
      input.source,
      input.txHash || '',
      input.details,
    ].join('|');
    const entry: AuditEntry = {
      id,
      timestamp,
      action: input.action,
      actor: input.actor.toLowerCase(),
      recordId: input.recordId,
      source: input.source,
      txHash: input.txHash,
      details: input.details,
      prevHash,
      entryHash: sha256String(material),
    };
    db.audit.push(entry);
    return entry;
  });
}

export function verifyAuditChain(entries: AuditEntry[]) {
  let prev = '0'.repeat(64);
  for (const entry of entries) {
    if (entry.prevHash !== prev) return false;
    const material = [
      entry.prevHash,
      String(entry.timestamp),
      entry.action,
      entry.actor.toLowerCase(),
      entry.recordId || '',
      entry.source,
      entry.txHash || '',
      entry.details,
    ].join('|');
    if (sha256String(material) !== entry.entryHash) return false;
    prev = entry.entryHash;
  }
  return true;
}
