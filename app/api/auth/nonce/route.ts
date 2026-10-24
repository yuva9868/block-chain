import { NextRequest, NextResponse } from 'next/server';
import { createNonce } from '@/lib/server/auth';
import { clientKey, rateLimit } from '@/lib/server/rate-limit';

export async function POST(req: NextRequest) {
  if (!rateLimit(`nonce:${clientKey(req.headers)}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const address = String(body?.address || '');
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
  }
  const nonce = createNonce(address);
  const issuedAt = new Date().toISOString();
  return NextResponse.json({ nonce, issuedAt });
}
