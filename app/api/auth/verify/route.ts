import { NextRequest, NextResponse } from 'next/server';
import {
  loginMessage,
  recoverAddress,
  setSessionCookie,
  takeNonce,
  upsertUser,
} from '@/lib/server/auth';
import { appendAudit } from '@/lib/server/audit';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';
import type { UserRole } from '@/types';

export async function POST(req: NextRequest) {
  if (!rateLimit(`login:${clientKey(req.headers)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const address = String(body?.address || '');
  const role = body?.role as UserRole;
  const nonce = String(body?.nonce || '');
  const issuedAt = String(body?.issuedAt || '');
  const signature = String(body?.signature || '');

  if (!/^0x[a-fA-F0-9]{40}$/.test(address) || (role !== 'patient' && role !== 'doctor')) {
    return NextResponse.json({ error: 'Address and role are required' }, { status: 400 });
  }
  if (!takeNonce(address, nonce)) {
    return NextResponse.json({ error: 'Nonce is invalid or expired' }, { status: 400 });
  }

  const message = loginMessage(address, role, nonce, issuedAt);
  let recovered: string;
  try {
    recovered = recoverAddress(message, signature);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return NextResponse.json({ error: 'Signature does not match wallet' }, { status: 401 });
  }

  try {
    await upsertUser(address, role);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Could not register user';
    return NextResponse.json({ error: messageText }, { status: 403 });
  }

  await setSessionCookie({
    address: address.toLowerCase(),
    role,
    exp: Date.now() + 12 * 60 * 60 * 1000,
  });
  await appendAudit({
    action: 'login',
    actor: address,
    source: 'off-chain',
    details: `role=${role}`,
  });
  return NextResponse.json({ address: address.toLowerCase(), role });
}
