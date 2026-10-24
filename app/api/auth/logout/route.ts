import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/server/auth';
import { appendAudit } from '@/lib/server/audit';

export async function POST() {
  const session = await getSession();
  if (session) {
    await appendAudit({
      action: 'logout',
      actor: session.address,
      source: 'off-chain',
      details: 'session_cleared',
    });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
