import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server/auth';
import {
  isContractConfigured,
  PUBLIC_CHAIN_ID,
  PUBLIC_CHAIN_NAME,
  PUBLIC_CONTRACT_ADDRESS,
  PUBLIC_EXPLORER_TX_URL,
  PUBLIC_RPC_URL,
} from '@/lib/config';

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    session: session ? { address: session.address, role: session.role } : null,
    chain: {
      configured: isContractConfigured(),
      chainId: PUBLIC_CHAIN_ID,
      chainName: PUBLIC_CHAIN_NAME,
      contractAddress: PUBLIC_CONTRACT_ADDRESS || null,
      rpcUrl: PUBLIC_RPC_URL,
      explorerTxUrl: PUBLIC_EXPLORER_TX_URL || null,
    },
  });
}
