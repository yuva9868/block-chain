'use client';

import { explorerTxUrl, PUBLIC_CHAIN_NAME, PUBLIC_CONTRACT_ADDRESS } from '@/lib/config';
import type { TxState } from '@/types';

export function TxStatus({ tx }: { tx: TxState }) {
  if (tx.status === 'idle') return null;
  const link = tx.hash ? explorerTxUrl(tx.hash) : null;
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
      <p className="font-medium capitalize">Transaction {tx.status}</p>
      {tx.hash && (
        <p className="font-mono break-all text-xs">
          Tx: {tx.hash}
          {link && (
            <a className="ml-2 text-primary underline" href={link} target="_blank" rel="noreferrer">
              View on explorer
            </a>
          )}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Network: {PUBLIC_CHAIN_NAME} · Contract: {PUBLIC_CONTRACT_ADDRESS || 'not configured'}
      </p>
      {tx.error && <p className="text-destructive">{tx.error}</p>}
    </div>
  );
}
