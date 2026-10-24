import { NextResponse } from 'next/server';
import { assertRole, getSession, jsonError } from '@/lib/server/auth';
import { getDb } from '@/lib/server/store';
import { verifyAuditChain } from '@/lib/server/audit';

export async function GET() {
  try {
    const session = assertRole(await getSession(), ['patient', 'doctor']);
    const db = await getDb();
    const entries = db.audit.filter((entry) => {
      if (entry.actor === session.address) return true;
      if (session.role === 'patient') {
        const owned = db.records.filter((r) => r.ownerAddress === session.address).map((r) => r.id);
        return Boolean(entry.recordId && owned.includes(entry.recordId));
      }
      const shared = db.records
        .filter((r) => r.grants.some((g) => g.address === session.address && !g.revokedAt))
        .map((r) => r.id);
      return Boolean(entry.recordId && shared.includes(entry.recordId));
    });
    return NextResponse.json({
      entries,
      chainIntegrity: verifyAuditChain(db.audit),
    });
  } catch (error) {
    const { status, message } = jsonError(error, 401);
    return NextResponse.json({ error: message }, { status });
  }
}
