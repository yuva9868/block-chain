import { NextResponse } from 'next/server';
import { assertRole, getSession, jsonError } from '@/lib/server/auth';
import { listChainEvents } from '@/lib/server/chain';
import { PUBLIC_CHAIN_ID, PUBLIC_CHAIN_NAME, PUBLIC_CONTRACT_ADDRESS } from '@/lib/config';

export async function GET() {
  try {
    assertRole(await getSession(), ['patient', 'doctor']);
    const { latest, events } = await listChainEvents(0);
    return NextResponse.json({
      network: PUBLIC_CHAIN_NAME,
      chainId: PUBLIC_CHAIN_ID,
      contractAddress: PUBLIC_CONTRACT_ADDRESS,
      latestBlock: latest,
      events,
    });
  } catch (error) {
    const { status, message } = jsonError(error, 503);
    return NextResponse.json({ error: message, events: [] }, { status });
  }
}
