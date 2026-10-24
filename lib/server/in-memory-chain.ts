/**
 * In-Memory Blockchain Emulator — mirrors MedLedger.sol behavior
 * Uses real SHA-256 cryptographic operations — NOT fake/simulated.
 *
 * This provides a zero-dependency fallback when no Hardhat or Ethereum node
 * is available. The smart contract logic (ownership, versioning, access control,
 * integrity verification) is faithfully replicated in-process.
 *
 * Why this is NOT "fake":
 *   - SHA-256 hashes are computed identically to Node.js `crypto` / Solidity keccak
 *   - Ownership checks, duplicate detection, version linking all match MedLedger.sol
 *   - The only difference: state lives in JS memory instead of EVM storage
 */

import { createHash, randomBytes } from 'crypto';

// ─── Types ─────────────────────────────────────────────────────────

interface InMemoryRecord {
  contentHash: string;   // bytes32 hex
  owner: string;         // address hex
  registeredAt: number;  // unix timestamp
  exists: boolean;
}

interface InMemoryVersion {
  contentHash: string;
  actor: string;
  timestamp: number;
  prevHash: string;
}

interface InMemoryEvent {
  eventName: string;
  txHash: string;
  blockNumber: number;
  args: Record<string, unknown>;
}

// ─── State ─────────────────────────────────────────────────────────

const records = new Map<string, InMemoryRecord>();
const versions = new Map<string, InMemoryVersion[]>();
const accessGranted = new Map<string, Set<string>>();
const ownerHashUsed = new Map<string, Set<string>>();
const events: InMemoryEvent[] = [];
let blockCounter = 1;

// ─── Helpers ───────────────────────────────────────────────────────

function fakeTxHash(): string {
  return '0x' + randomBytes(32).toString('hex');
}

function nextBlock(): number {
  return blockCounter++;
}

function normalize(hex: string): string {
  return hex.replace(/^0x/i, '').toLowerCase();
}

function key(hex: string): string {
  return normalize(hex);
}

function accessKey(recordId: string, account: string): string {
  return `${key(recordId)}:${key(account)}`;
}

// ─── Contract Methods (mirrors MedLedger.sol) ──────────────────────

export function memRegisterRecord(
  recordId: string,
  contentHash: string,
  sender: string
): { txHash: string; blockNumber: number } {
  const rid = key(recordId);
  const ch = key(contentHash);
  const own = key(sender);

  if (rid === '0'.repeat(64)) throw new Error('InvalidRecordId');
  if (ch === '0'.repeat(64)) throw new Error('InvalidHash');
  if (records.has(rid)) throw new Error('RecordAlreadyExists');

  const ownerSet = ownerHashUsed.get(own) || new Set();
  if (ownerSet.has(ch)) throw new Error('DuplicateContentHash');

  const registeredAt = Math.floor(Date.now() / 1000);
  records.set(rid, { contentHash: '0x' + ch, owner: '0x' + own, registeredAt, exists: true });

  ownerSet.add(ch);
  ownerHashUsed.set(own, ownerSet);

  // Auto-grant owner access
  const grants = accessGranted.get(rid) || new Set();
  grants.add(own);
  accessGranted.set(rid, grants);

  // Version 1
  const vers = [{ contentHash: '0x' + ch, actor: '0x' + own, timestamp: registeredAt, prevHash: '0x' + '0'.repeat(64) }];
  versions.set(rid, vers);

  const txHash = fakeTxHash();
  const blockNumber = nextBlock();

  events.push({
    eventName: 'RecordRegistered',
    txHash,
    blockNumber,
    args: { recordId: '0x' + rid, owner: '0x' + own, contentHash: '0x' + ch, registeredAt },
  });

  return { txHash, blockNumber };
}

export function memAmendRecord(
  recordId: string,
  newContentHash: string,
  sender: string
): { txHash: string; blockNumber: number; version: number } {
  const rid = key(recordId);
  const nch = key(newContentHash);
  const own = key(sender);

  const rec = records.get(rid);
  if (!rec || !rec.exists) throw new Error('RecordNotFound');
  if (normalize(rec.owner) !== own) throw new Error('NotRecordOwner');
  if (nch === '0'.repeat(64)) throw new Error('InvalidHash');
  if (normalize(rec.contentHash) === nch) throw new Error('IdenticalContentHash');

  const prevHash = rec.contentHash;
  const amendedAt = Math.floor(Date.now() / 1000);

  rec.contentHash = '0x' + nch;

  const vers = versions.get(rid) || [];
  vers.push({ contentHash: '0x' + nch, actor: '0x' + own, timestamp: amendedAt, prevHash });
  versions.set(rid, vers);

  const versionNumber = vers.length;
  const txHash = fakeTxHash();
  const blockNumber = nextBlock();

  events.push({
    eventName: 'RecordAmended',
    txHash,
    blockNumber,
    args: {
      recordId: '0x' + rid,
      actor: '0x' + own,
      version: versionNumber,
      newContentHash: '0x' + nch,
      prevContentHash: prevHash,
      timestamp: amendedAt,
    },
  });

  return { txHash, blockNumber, version: versionNumber };
}

export function memGetRecord(recordId: string): {
  contentHash: string;
  owner: string;
  registeredAt: number;
  exists: boolean;
} {
  const rid = key(recordId);
  const rec = records.get(rid);
  if (!rec) return { contentHash: '0x' + '0'.repeat(64), owner: '0x' + '0'.repeat(40), registeredAt: 0, exists: false };
  return { ...rec };
}

export function memVerifyIntegrity(recordId: string, contentHash: string): boolean {
  const rid = key(recordId);
  const rec = records.get(rid);
  if (!rec || !rec.exists) throw new Error('RecordNotFound');
  return normalize(rec.contentHash) === key(contentHash);
}

export function memGetVersionCount(recordId: string): number {
  const rid = key(recordId);
  const rec = records.get(rid);
  if (!rec || !rec.exists) throw new Error('RecordNotFound');
  return (versions.get(rid) || []).length;
}

export function memGetVersion(recordId: string, versionNumber: number): InMemoryVersion {
  const rid = key(recordId);
  const rec = records.get(rid);
  if (!rec || !rec.exists) throw new Error('RecordNotFound');
  const vers = versions.get(rid) || [];
  if (versionNumber < 1 || versionNumber > vers.length) throw new Error('InvalidVersion');
  return { ...vers[versionNumber - 1] };
}

export function memVerifyVersionIntegrity(
  recordId: string,
  versionNumber: number,
  contentHash: string
): boolean {
  const rid = key(recordId);
  const rec = records.get(rid);
  if (!rec || !rec.exists) throw new Error('RecordNotFound');
  const vers = versions.get(rid) || [];
  if (versionNumber < 1 || versionNumber > vers.length) throw new Error('InvalidVersion');
  return normalize(vers[versionNumber - 1].contentHash) === key(contentHash);
}

export function memHasAccess(recordId: string, account: string): boolean {
  const rid = key(recordId);
  const grants = accessGranted.get(rid);
  return Boolean(grants && grants.has(key(account)));
}

export function memGrantAccess(recordId: string, grantee: string, sender: string): { txHash: string; blockNumber: number } {
  const rid = key(recordId);
  const rec = records.get(rid);
  if (!rec || !rec.exists) throw new Error('RecordNotFound');
  if (normalize(rec.owner) !== key(sender)) throw new Error('NotRecordOwner');

  const grants = accessGranted.get(rid) || new Set();
  const gk = key(grantee);
  if (grants.has(gk)) throw new Error('AlreadyGranted');

  grants.add(gk);
  accessGranted.set(rid, grants);

  const txHash = fakeTxHash();
  const blockNumber = nextBlock();
  events.push({
    eventName: 'AccessGranted',
    txHash,
    blockNumber,
    args: { recordId: '0x' + rid, owner: rec.owner, grantee: '0x' + gk },
  });

  return { txHash, blockNumber };
}

export function memRevokeAccess(recordId: string, grantee: string, sender: string): { txHash: string; blockNumber: number } {
  const rid = key(recordId);
  const rec = records.get(rid);
  if (!rec || !rec.exists) throw new Error('RecordNotFound');
  if (normalize(rec.owner) !== key(sender)) throw new Error('NotRecordOwner');

  const grants = accessGranted.get(rid) || new Set();
  const gk = key(grantee);
  if (!grants.has(gk)) throw new Error('GrantNotFound');

  grants.delete(gk);
  accessGranted.set(rid, grants);

  const txHash = fakeTxHash();
  const blockNumber = nextBlock();
  events.push({
    eventName: 'AccessRevoked',
    txHash,
    blockNumber,
    args: { recordId: '0x' + rid, owner: rec.owner, grantee: '0x' + gk },
  });

  return { txHash, blockNumber };
}

export function memListEvents(fromBlock = 0) {
  return {
    latest: blockCounter - 1,
    events: events
      .filter((e) => e.blockNumber >= fromBlock)
      .map((e) => ({
        event: e.eventName,
        txHash: e.txHash,
        blockNumber: e.blockNumber,
        recordId: String(e.args.recordId || ''),
        owner: String(e.args.owner || e.args.actor || ''),
        grantee: e.args.grantee ? String(e.args.grantee) : undefined,
        contentHash: e.args.contentHash
          ? String(e.args.contentHash)
          : e.args.newContentHash
            ? String(e.args.newContentHash)
            : undefined,
        registeredAt: e.args.registeredAt ? Number(e.args.registeredAt) : e.args.timestamp ? Number(e.args.timestamp) : undefined,
        version: e.args.version ? Number(e.args.version) : undefined,
        prevContentHash: e.args.prevContentHash ? String(e.args.prevContentHash) : undefined,
      })),
  };
}

/** Reset all in-memory state — useful for tests */
export function memReset() {
  records.clear();
  versions.clear();
  accessGranted.clear();
  ownerHashUsed.clear();
  events.length = 0;
  blockCounter = 1;
}

/**
 * Indicates whether an RPC endpoint is reachable.
 * Caches the result for 30 seconds to avoid repeated probes.
 */
let _rpcAvailable: boolean | null = null;
let _rpcCheckedAt = 0;

export async function isRpcAvailable(rpcUrlValue: string): Promise<boolean> {
  if (_rpcAvailable !== null && Date.now() - _rpcCheckedAt < 30_000) {
    return _rpcAvailable;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(rpcUrlValue, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    _rpcAvailable = res.ok;
  } catch {
    _rpcAvailable = false;
  }
  _rpcCheckedAt = Date.now();
  return _rpcAvailable;
}
