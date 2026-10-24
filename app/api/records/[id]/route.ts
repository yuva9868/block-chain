import { NextRequest, NextResponse } from 'next/server';
import { assertRole, getSession, jsonError } from '@/lib/server/auth';
import { authorizeRecord, findRecord } from '@/lib/server/access';
import { appendAudit } from '@/lib/server/audit';
import { confirmAmendmentTx, confirmRegistrationTx, onChainVerify, readOnChainRecord } from '@/lib/server/chain';
import { mutateDb } from '@/lib/server/store';
import { canonicalizeRecord, hashCanonicalRecord } from '@/lib/server/canonical';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = assertRole(await getSession(), ['patient', 'doctor']);
    const { id } = await context.params;
    const record = await findRecord(id);
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    const access = await authorizeRecord(session, record);
    await appendAudit({
      action: 'record_metadata_view',
      actor: session.address,
      recordId: record.id,
      source: 'off-chain',
      details: `chainAvailable=${access.chainAvailable}`,
    });
    let verification: { status: string; onChainHash?: string; calculatedHash?: string; error?: string } = { status: 'pending' };
    if (record.status === 'registered') {
      try {
        const onChain = await readOnChainRecord(record.id);
        const match = await onChainVerify(record.id, record.contentHash);
        verification = {
          status: match ? 'verified' : 'mismatch',
          onChainHash: onChain.contentHash,
          calculatedHash: record.contentHash,
        };
      } catch (error) {
        verification = {
          status: 'unavailable',
          error: error instanceof Error ? error.message : 'RPC unavailable',
        };
      }
    }
    return NextResponse.json({ record, verification, access });
  } catch (error) {
    const { status, message } = jsonError(error, 401);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = assertRole(await getSession(), ['patient']);
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const action = String(body?.action || 'register');
    const txHash = String(body?.txHash || '');
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json({ error: 'A real 32-byte transaction hash is required' }, { status: 400 });
    }
    const record = await findRecord(id);
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    if (record.ownerAddress !== session.address) {
      return NextResponse.json({ error: 'Only the owner can modify or confirm this record' }, { status: 403 });
    }

    if (action === 'amend') {
      const diagnosis = String(body?.diagnosis || record.diagnosis || '').trim();
      const treatment = String(body?.treatment || record.treatment || '').trim();
      const reason = String(body?.reason || 'Authorized clinical amendment').trim();

      const confirmed = await confirmAmendmentTx(txHash, record.id, session.address);
      const now = Date.now();

      const canonical = canonicalizeRecord({
        recordId: record.id,
        patientId: record.patientId || session.address,
        doctorId: record.doctorId || 'doc-general',
        recordType: record.recordType,
        diagnosis,
        treatment,
        version: confirmed.version,
        timestamp: now,
      });

      const updated = await mutateDb((db) => {
        const target = db.records.find((r) => r.id === record.id);
        if (!target) throw Object.assign(new Error('Record not found'), { status: 404 });
        target.contentHash = confirmed.newHash;
        target.version = confirmed.version;
        target.diagnosis = diagnosis;
        target.treatment = treatment;
        target.canonicalString = canonical.canonicalString;
        target.txHash = confirmed.txHash;
        target.blockNumber = confirmed.blockNumber;
        if (!target.versions) target.versions = [];
        target.versions.push({
          version: confirmed.version,
          contentHash: confirmed.newHash,
          prevHash: confirmed.prevHash,
          canonicalString: canonical.canonicalString,
          diagnosis,
          treatment,
          actor: session.address,
          timestamp: now,
          txHash: confirmed.txHash,
          blockNumber: confirmed.blockNumber,
          reason,
        });
        return target;
      });

      await appendAudit({
        action: 'authorized_amendment',
        actor: session.address,
        recordId: record.id,
        source: 'on-chain',
        txHash: confirmed.txHash,
        details: `version=${confirmed.version}|reason=${reason}`,
      });

      return NextResponse.json({ record: updated });
    }

    // Default: confirm registration
    const confirmed = await confirmRegistrationTx(txHash, record.id, session.address);
    const updated = await mutateDb((db) => {
      const target = db.records.find((r) => r.id === record.id);
      if (!target) throw Object.assign(new Error('Record not found'), { status: 404 });
      target.status = 'registered';
      target.txHash = confirmed.txHash;
      target.blockNumber = confirmed.blockNumber;
      if (!target.versions || target.versions.length === 0) {
        target.versions = [
          {
            version: 1,
            contentHash: target.contentHash,
            canonicalString: target.canonicalString,
            diagnosis: target.diagnosis,
            treatment: target.treatment,
            actor: session.address,
            timestamp: target.createdAt,
            txHash: confirmed.txHash,
            blockNumber: confirmed.blockNumber,
          },
        ];
      } else {
        target.versions[0].txHash = confirmed.txHash;
        target.versions[0].blockNumber = confirmed.blockNumber;
      }
      return target;
    });
    await appendAudit({
      action: 'blockchain_registration',
      actor: session.address,
      recordId: record.id,
      source: 'on-chain',
      txHash: confirmed.txHash,
      details: `block=${confirmed.blockNumber}`,
    });
    return NextResponse.json({ record: updated });
  } catch (error) {
    const { status, message } = jsonError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
