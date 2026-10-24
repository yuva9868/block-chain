import { NextRequest, NextResponse } from 'next/server';
import { assertRole, getSession, jsonError } from '@/lib/server/auth';
import { findRecord } from '@/lib/server/access';
import { appendAudit } from '@/lib/server/audit';
import { confirmAccessTx } from '@/lib/server/chain';
import { mutateDb } from '@/lib/server/store';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = assertRole(await getSession(), ['patient']);
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    const action = body?.action === 'revoke' ? 'revoke' : 'grant';
    const doctor = String(body?.doctor || '').toLowerCase();
    const txHash = String(body?.txHash || '');

    if (!/^0x[a-fA-F0-9]{40}$/.test(doctor)) {
      return NextResponse.json({ error: 'Valid doctor wallet address required' }, { status: 400 });
    }

    const record = await findRecord(id);
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    if (record.ownerAddress !== session.address) {
      return NextResponse.json({ error: 'Only the patient owner can change consent' }, { status: 403 });
    }

    const isDemo = body?.relay === true || !txHash || String(session.address).toLowerCase().startsWith('0xd3');
    let confirmedTxHash = txHash;

    if (isDemo) {
      const { relayGrantAccess, relayRevokeAccess } = await import('@/lib/server/demo-relayer');
      const rel =
        action === 'grant'
          ? await relayGrantAccess(record.id, doctor, session.address)
          : await relayRevokeAccess(record.id, doctor, session.address);
      confirmedTxHash = rel.txHash;
    } else {
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return NextResponse.json({ error: 'A real transaction hash is required' }, { status: 400 });
      }
      const eventName = action === 'grant' ? 'AccessGranted' : 'AccessRevoked';
      const confirmed = await confirmAccessTx(txHash, record.id, session.address, doctor, eventName);
      confirmedTxHash = confirmed.txHash;
    }

    const updated = await mutateDb((db) => {
      const target = db.records.find((r) => r.id === record.id);
      if (!target) throw Object.assign(new Error('Record not found'), { status: 404 });
      if (action === 'grant') {
        const existing = target.grants.find((g) => g.address === doctor && !g.revokedAt);
        if (!existing) {
          target.grants.push({
            address: doctor,
            grantedAt: Date.now(),
            grantTxHash: confirmedTxHash,
          });
        }
      } else {
        const existing = target.grants.find((g) => g.address === doctor && !g.revokedAt);
        if (existing) {
          existing.revokedAt = Date.now();
          existing.revokeTxHash = confirmedTxHash;
        }
      }
      return target;
    });

    await appendAudit({
      action: action === 'grant' ? 'permission_granted' : 'permission_revoked',
      actor: session.address,
      recordId: record.id,
      source: 'on-chain',
      txHash: confirmedTxHash,
      details: `doctor=${doctor}`,
    });

    return NextResponse.json({ record: updated });
  } catch (error) {
    const { status, message } = jsonError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
