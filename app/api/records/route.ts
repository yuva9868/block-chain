import { NextRequest, NextResponse } from 'next/server';
import { assertRole, getSession, jsonError } from '@/lib/server/auth';
import { appendAudit } from '@/lib/server/audit';
import { mutateDb, saveEncryptedFile, type StoredRecord } from '@/lib/server/store';
import { randomId, sha256Buffer } from '@/lib/server/crypto';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';
import { authorizeRecord } from '@/lib/server/access';
import { onChainVerify, readOnChainRecord } from '@/lib/server/chain';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpeg',
  'application/json',
]);
const MAX_BYTES = 10 * 1024 * 1024;

function publicRecord(record: StoredRecord) {
  return {
    id: record.id,
    ownerAddress: record.ownerAddress,
    contentHash: record.contentHash,
    filename: record.filename,
    description: record.description,
    recordType: record.recordType,
    recordDate: record.recordDate,
    mimeType: record.mimeType,
    size: record.size,
    createdAt: record.createdAt,
    status: record.status,
    txHash: record.txHash,
    blockNumber: record.blockNumber,
    grants: record.grants,
    patientId: record.patientId || 'patient-self',
    doctorId: record.doctorId || 'doc-general',
    diagnosis: record.diagnosis || '',
    treatment: record.treatment || '',
    version: record.version || 1,
    canonicalString: record.canonicalString,
    isSyntheticDemo: Boolean(record.isSyntheticDemo),
    versions: record.versions || [],
  };
}

export async function GET() {
  try {
    const session = assertRole(await getSession(), ['patient', 'doctor']);
    const { getDb, isGrantActive } = await import('@/lib/server/store');
    const db = await getDb();
    const visible = db.records.filter((record) => {
      if (session.role === 'patient') return record.ownerAddress === session.address;
      return isGrantActive(record, session.address);
    });
    const withVerification = await Promise.all(
      visible.map(async (record) => {
        const base = publicRecord(record);
        if (record.status !== 'registered' || !record.txHash) {
          return { ...base, verification: { status: 'pending' as const } };
        }
        try {
          const onChain = await readOnChainRecord(record.id);
          const match = await onChainVerify(record.id, record.contentHash);
          return {
            ...base,
            verification: {
              status: match ? 'verified' : 'mismatch',
              onChainHash: onChain.contentHash,
              calculatedHash: record.contentHash,
            },
          };
        } catch (error) {
          return {
            ...base,
            verification: {
              status: 'unavailable' as const,
              error: error instanceof Error ? error.message : 'RPC unavailable',
            },
          };
        }
      })
    );
    return NextResponse.json({ records: withVerification });
  } catch (error) {
    const { status, message } = jsonError(error, 401);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`upload:${clientKey(req.headers)}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many uploads' }, { status: 429 });
    }
    const session = assertRole(await getSession(), ['patient']);
    const form = await req.formData();
    const file = form.get('file');
    const description = String(form.get('description') || '').trim();
    const recordType = String(form.get('recordType') || 'clinical_note').trim();
    const recordDate = String(form.get('recordDate') || new Date().toISOString().split('T')[0]).trim();
    const diagnosis = String(form.get('diagnosis') || description).trim();
    const treatment = String(form.get('treatment') || '').trim();
    const doctorId = String(form.get('doctorId') || 'doc-general').trim();
    const patientId = String(form.get('patientId') || session.address).trim();
    const clientHash = String(form.get('contentHash') || '').replace(/^0x/, '').toLowerCase();

    if (!(file instanceof File) && !diagnosis) {
      return NextResponse.json({ error: 'A medical file or clinical details are required' }, { status: 400 });
    }
    if (!description && !diagnosis) {
      return NextResponse.json({ error: 'Description or clinical notes are required' }, { status: 400 });
    }

    const { canonicalizeRecord, hashCanonicalRecord } = await import('@/lib/server/canonical');
    const id = randomId();

    let bytes = Buffer.from('');
    let contentHash = '';
    let canonicalString = '';
    let filename = 'clinical-record.json';
    let mimeType = 'application/json';
    let size = 0;

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'File exceeds the 10MB limit' }, { status: 400 });
      }
      if (file.type && !ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: 'File type is not allowed' }, { status: 400 });
      }
      bytes = Buffer.from(await file.arrayBuffer());
      filename = file.name.slice(0, 180);
      mimeType = file.type || 'application/octet-stream';
      size = file.size;

      // Produce canonical representation including file SHA-256 + structured metadata
      const fileSha = sha256Buffer(bytes);
      const canonical = canonicalizeRecord({
        recordId: id,
        patientId,
        doctorId,
        recordType,
        diagnosis: diagnosis || description,
        treatment: treatment || `File attached: ${filename} (SHA-256: ${fileSha})`,
        version: 1,
        timestamp: Date.now(),
      });
      canonicalString = canonical.canonicalString;
      contentHash = hashCanonicalRecord(canonicalString);
    } else {
      const canonical = canonicalizeRecord({
        recordId: id,
        patientId,
        doctorId,
        recordType,
        diagnosis,
        treatment,
        version: 1,
        timestamp: Date.now(),
      });
      canonicalString = canonical.canonicalString;
      contentHash = hashCanonicalRecord(canonicalString);
      bytes = Buffer.from(canonicalString, 'utf8');
      size = bytes.length;
    }

    const fileSha = file instanceof File && file.size > 0 ? sha256Buffer(bytes) : '';
    if (clientHash && clientHash !== contentHash && clientHash !== fileSha) {
      return NextResponse.json({ error: 'Client hash does not match the server-computed SHA-256 hash' }, { status: 400 });
    }

    await saveEncryptedFile(id, bytes);
    const now = Date.now();
    const isDemoUser = String(session.address).toLowerCase().startsWith('0xd3');
    const autoRelay = form.get('relay') === 'true' || isDemoUser;

    const record: StoredRecord = {
      id,
      ownerAddress: session.address,
      contentHash,
      filename,
      description: description || diagnosis,
      recordType,
      recordDate,
      mimeType,
      size,
      createdAt: now,
      status: 'pending_chain',
      grants: [],
      patientId,
      doctorId,
      diagnosis,
      treatment,
      version: 1,
      canonicalString,
      versions: [
        {
          version: 1,
          contentHash,
          canonicalString,
          diagnosis,
          treatment,
          actor: session.address,
          timestamp: now,
        },
      ],
    };

    let relayedTxHash: string | undefined;

    if (autoRelay) {
      const { relayRegisterRecord } = await import('@/lib/server/demo-relayer');
      const rel = await relayRegisterRecord(id, contentHash);
      record.status = 'registered';
      record.txHash = rel.txHash;
      record.blockNumber = rel.blockNumber;
      if (record.versions && record.versions[0]) {
        record.versions[0].txHash = rel.txHash;
        record.versions[0].blockNumber = rel.blockNumber;
      }
      relayedTxHash = rel.txHash;
    }

    await mutateDb((db) => {
      db.records.push(record);
    });

    await appendAudit({
      action: 'record_created',
      actor: session.address,
      recordId: id,
      source: 'off-chain',
      details: `hash=${contentHash}|size=${size}`,
    });

    if (autoRelay && relayedTxHash) {
      await appendAudit({
        action: 'blockchain_registration',
        actor: session.address,
        recordId: id,
        source: 'on-chain',
        txHash: relayedTxHash,
        details: `relayed=true|block=${record.blockNumber || 1}`,
      });
    }

    return NextResponse.json({ record: publicRecord(record), relayed: autoRelay, txHash: relayedTxHash });
  } catch (error) {
    const { status, message } = jsonError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
