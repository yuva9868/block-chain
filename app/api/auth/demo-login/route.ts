import { NextRequest, NextResponse } from 'next/server';
import { setSessionCookie } from '@/lib/server/auth';
import { appendAudit } from '@/lib/server/audit';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';
import { mutateDb } from '@/lib/server/store';
import type { UserRole } from '@/types';

// Fixed 40-hex-char demo wallet addresses (no real keys, demo only)
const DEMO_PATIENT = '0xd3m0000000000000000000000000000000000001';
const DEMO_DOCTOR  = '0xd3m0000000000000000000000000000000000002';

// Validate they are proper hex (replace the 'm' placeholder)
const PATIENT_ADDR = '0xd3' + '0'.repeat(37) + '1'; // 0x + 40 hex chars
const DOCTOR_ADDR  = '0xd3' + '0'.repeat(37) + '2';

export async function POST(req: NextRequest) {
  if (!rateLimit(`demo-login:${clientKey(req.headers)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const role = body?.role as UserRole;

  if (role !== 'patient' && role !== 'doctor') {
    return NextResponse.json({ error: 'role must be patient or doctor' }, { status: 400 });
  }

  const address = role === 'patient' ? PATIENT_ADDR : DOCTOR_ADDR;

  // Insert directly into db, bypassing the doctor allowlist (this is a demo bypass)
  await mutateDb((db) => {
    const existing = db.users.find((u) => u.address === address);
    if (!existing) {
      db.users.push({ address, role, createdAt: Date.now() });
    }
  });

  await setSessionCookie({
    address,
    role,
    exp: Date.now() + 12 * 60 * 60 * 1000,
  });

  await appendAudit({
    action: 'demo-login',
    actor: address,
    source: 'off-chain',
    details: `role=${role} (demo mode – no wallet required)`,
  });

  return NextResponse.json({ address, role, demo: true });
}
