import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { decryptBuffer, encryptBuffer } from './crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILES_DIR = path.join(DATA_DIR, 'files');

export type UserRole = 'patient' | 'doctor';

export type StoredGrant = {
  address: string;
  grantedAt: number;
  grantTxHash?: string;
  revokedAt?: number;
  revokeTxHash?: string;
};

export type StoredRecordVersion = {
  version: number;
  contentHash: string;
  prevHash?: string;
  canonicalString?: string;
  diagnosis?: string;
  treatment?: string;
  actor: string;
  timestamp: number;
  txHash?: string;
  blockNumber?: number;
  reason?: string;
};

export type StoredRecord = {
  id: string;
  ownerAddress: string;
  contentHash: string;
  filename: string;
  description: string;
  recordType: string;
  recordDate: string;
  mimeType: string;
  size: number;
  createdAt: number;
  status: 'pending_chain' | 'registered' | 'failed';
  txHash?: string;
  blockNumber?: number;
  grants: StoredGrant[];
  patientId?: string;
  doctorId?: string;
  diagnosis?: string;
  treatment?: string;
  version?: number;
  canonicalString?: string;
  isSyntheticDemo?: boolean;
  versions?: StoredRecordVersion[];
  originalDemoSnapshot?: {
    diagnosis: string;
    treatment: string;
    contentHash: string;
    canonicalString: string;
  };
};

export type AuditSource = 'on-chain' | 'off-chain';

export type AuditEntry = {
  id: string;
  timestamp: number;
  action: string;
  actor: string;
  recordId?: string;
  source: AuditSource;
  txHash?: string;
  details: string;
  prevHash: string;
  entryHash: string;
};

export type StoredUser = {
  address: string;
  role: UserRole;
  createdAt: number;
};

type Database = {
  users: StoredUser[];
  records: StoredRecord[];
  audit: AuditEntry[];
};

const emptyDb = (): Database => ({ users: [], records: [], audit: [] });

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDirs() {
  await mkdir(FILES_DIR, { recursive: true });
}

async function readDb(): Promise<Database> {
  await ensureDirs();
  try {
    const raw = await readFile(path.join(DATA_DIR, 'db.json'), 'utf8');
    const parsed = JSON.parse(raw) as Database;
    return {
      users: parsed.users || [],
      records: parsed.records || [],
      audit: parsed.audit || [],
    };
  } catch {
    return emptyDb();
  }
}

async function writeDb(db: Database) {
  await ensureDirs();
  const tmp = path.join(DATA_DIR, 'db.json.tmp');
  await writeFile(tmp, JSON.stringify(db, null, 2), 'utf8');
  await writeFile(path.join(DATA_DIR, 'db.json'), JSON.stringify(db, null, 2), 'utf8');
}

export function mutateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  });
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function getDb() {
  return readDb();
}

export async function saveEncryptedFile(recordId: string, bytes: Buffer) {
  await ensureDirs();
  const encrypted = encryptBuffer(bytes);
  await writeFile(path.join(FILES_DIR, `${recordId}.bin`), encrypted);
}

export async function loadDecryptedFile(recordId: string) {
  const payload = await readFile(path.join(FILES_DIR, `${recordId}.bin`));
  return decryptBuffer(payload);
}

export function isGrantActive(record: StoredRecord, address: string) {
  const grant = record.grants.find((g) => g.address.toLowerCase() === address.toLowerCase());
  return Boolean(grant && !grant.revokedAt);
}
