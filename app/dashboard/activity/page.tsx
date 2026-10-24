'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ChainEvent } from '@/types';
import { explorerTxUrl, PUBLIC_CHAIN_NAME, PUBLIC_CONTRACT_ADDRESS } from '@/lib/config';
import { formatHash } from '@/lib/hash';

export default function ActivityPage() {
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [latest, setLatest] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/chain/events')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Could not read blockchain events');
          setEvents([]);
          return;
        }
        setEvents(data.events || []);
        setLatest(data.latestBlock ?? null);
        setError(null);
      })
      .catch(() => setError('RPC or API request failed'));
  }, []);

  const visible = useMemo(
    () =>
      events.filter(
        (event) =>
          !filter ||
          event.event.toLowerCase().includes(filter.toLowerCase()) ||
          event.txHash.toLowerCase().includes(filter.toLowerCase())
      ),
    [events, filter]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Blockchain activity</h1>
        <p className="text-muted-foreground mt-2">
          Live events from {PUBLIC_CHAIN_NAME}. Contract {PUBLIC_CONTRACT_ADDRESS || 'not configured'}.
          {latest != null ? ` Latest block ${latest}.` : ''}
        </p>
      </div>
      {error && (
        <Card className="p-4 text-sm text-amber-800 dark:text-amber-300">
          {error}. This page does not invent transactions.
        </Card>
      )}
      <Input placeholder="Filter by event or transaction hash" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <Card className="p-6 overflow-x-auto">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No confirmed contract events found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Block</TableHead>
                <TableHead>Tx</TableHead>
                <TableHead>Record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((event) => (
                <TableRow key={event.txHash + event.event + event.recordId}>
                  <TableCell>{event.event}</TableCell>
                  <TableCell>{event.blockNumber}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatHash(event.txHash)}
                    {explorerTxUrl(event.txHash) && (
                      <a className="ml-2 underline" href={explorerTxUrl(event.txHash)!} target="_blank" rel="noreferrer">
                        open
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatHash(event.recordId)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
