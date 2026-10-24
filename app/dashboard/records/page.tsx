'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRecords } from '@/lib/records-context';
import { useWeb3 } from '@/lib/web3-context';
import { formatAddress, isValidAddress } from '@/lib/web3';
import { formatHash } from '@/lib/hash';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { explainWalletError, sendGrantAccess, sendRevokeAccess } from '@/lib/chain/browser';
import { TxStatus } from '@/components/tx-status';
import type { MedicalRecord, TxState } from '@/types';

export default function RecordsPage() {
  const { records, refreshRecords, refreshLogs } = useRecords();
  const { wallet, role, chain, hasWallet } = useWeb3();
  const isDoctor = role === 'doctor';
  const [selected, setSelected] = useState<MedicalRecord | null>(null);
  const [doctor, setDoctor] = useState('');
  const [tx, setTx] = useState<TxState>({ status: 'idle' });

  const isDemo = !hasWallet || !chain.configured || String(wallet.address || '').toLowerCase().startsWith('0xd3');

  const runConsent = async (action: 'grant' | 'revoke') => {
    if (!selected || !isValidAddress(doctor)) {
      toast.error('A valid doctor address (40 hex characters) is required.');
      return;
    }
    setTx({ status: 'pending' });
    try {
      if (isDemo) {
        const res = await fetch(`/api/records/${selected.id}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, doctor, relay: true }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Consent update failed');
        setTx({ status: 'confirmed', hash: '0x' + '0'.repeat(64) });
        await refreshRecords();
        await refreshLogs();
        toast.success(action === 'grant' ? 'Consent granted (demo relayer)' : 'Consent revoked (demo relayer)');
        return;
      }

      const sent = action === 'grant' ? await sendGrantAccess(selected.id, doctor) : await sendRevokeAccess(selected.id, doctor);
      setTx({ status: 'pending', hash: sent.hash });
      const receipt = await sent.wait();
      if (!receipt || receipt.status !== 1) {
        setTx({ status: 'reverted', hash: sent.hash, error: 'Transaction reverted' });
        return;
      }
      const res = await fetch(`/api/records/${selected.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, doctor, txHash: receipt.hash }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setTx({ status: 'confirmed', hash: receipt.hash });
      await refreshRecords();
      await refreshLogs();
      toast.success(action === 'grant' ? 'Consent granted after confirmation' : 'Consent revoked after confirmation');
    } catch (error) {
      setTx({ status: 'error', hash: tx.hash, error: explainWalletError(error) });
      toast.error(explainWalletError(error));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{isDoctor ? 'Authorized records' : 'My records'}</h1>
        <p className="text-muted-foreground mt-2">
          {isDoctor
            ? 'Only records with an active on-chain grant for this wallet are listed. Changing a URL will not bypass the API.'
            : 'Grant and revoke access with real contract transactions. Previously downloaded copies cannot be erased remotely.'}
        </p>
      </div>
      <Card className="p-6 overflow-x-auto">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No records available for this wallet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>Integrity</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <Link className="text-primary underline" href={`/dashboard/records/${record.id}`}>
                      {record.filename}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{formatHash(record.contentHash)}</TableCell>
                  <TableCell>{record.verification?.status || record.status}</TableCell>
                  <TableCell>{formatDistanceToNow(record.createdAt || Date.now(), { addSuffix: true })}</TableCell>
                  <TableCell>
                    {!isDoctor && (
                      <Button size="sm" variant="outline" onClick={() => setSelected(record)}>
                        Consent
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage doctor consent</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Record {selected ? formatHash(selected.id) : ''} · active grants:{' '}
            {(selected?.grants || []).filter((g) => !g.revokedAt).map((g) => formatAddress(g.address)).join(', ') || 'none'}
          </p>
          <Input placeholder="Doctor wallet 0x..." value={doctor} onChange={(e) => setDoctor(e.target.value)} className="font-mono" />
          <div className="flex gap-2">
            <Button onClick={() => runConsent('grant')} disabled={tx.status === 'pending'}>
              Grant
            </Button>
            <Button variant="outline" onClick={() => runConsent('revoke')} disabled={tx.status === 'pending'}>
              Revoke
            </Button>
          </div>
          <TxStatus tx={tx} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
