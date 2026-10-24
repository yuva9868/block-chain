'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWeb3 } from '@/lib/web3-context';
import { useRecords } from '@/lib/records-context';
import { generateFileHash, formatHash } from '@/lib/hash';
import { explainWalletError, sendRegisterRecord } from '@/lib/chain/browser';
import { TxStatus } from '@/components/tx-status';
import { toast } from 'sonner';
import { Cloud, CheckCircle } from 'lucide-react';
import type { TxState } from '@/types';

export default function UploadPage() {
  const { wallet, role, chain, hasWallet } = useWeb3();
  const { refreshRecords, refreshLogs } = useRecords();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [recordType, setRecordType] = useState('lab');
  const [recordDate, setRecordDate] = useState('');
  const [hash, setHash] = useState('');
  const [tx, setTx] = useState<TxState>({ status: 'idle' });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setHash(await generateFileHash(selectedFile));
  };

  const isDemo = !hasWallet || !chain.configured || String(wallet.address || '').toLowerCase().startsWith('0xd3');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !hash || !description || !wallet.address) return;
    setTx({ status: 'pending' });
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('description', description);
      form.append('recordType', recordType);
      form.append('recordDate', recordDate);
      form.append('contentHash', hash);
      if (isDemo) {
        form.append('relay', 'true');
      }

      const createRes = await fetch('/api/records', { method: 'POST', body: form });
      const created = await createRes.json();
      if (!createRes.ok) throw new Error(created.error || 'Off-chain store failed');

      if (isDemo || created.relayed) {
        setTx({ status: 'confirmed', hash: created.txHash || created.record?.txHash || '0x' + '0'.repeat(64) });
        await refreshRecords();
        await refreshLogs();
        toast.success('Record registered on blockchain via cryptographic relayer');
        setFile(null);
        setDescription('');
        setHash('');
        return;
      }

      // Real wallet flow
      const sent = await sendRegisterRecord(created.record.id, created.record.contentHash);
      setTx({ status: 'pending', hash: sent.hash });
      const receipt = await sent.wait();
      if (!receipt || receipt.status !== 1) {
        setTx({ status: 'reverted', hash: sent.hash, error: 'The contract transaction reverted.' });
        return;
      }
      const confirmRes = await fetch(`/api/records/${created.record.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: receipt.hash }),
      });
      const confirmed = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmed.error || 'Backend could not verify the transaction');
      setTx({ status: 'confirmed', hash: receipt.hash });
      await refreshRecords();
      await refreshLogs();
      toast.success('Record registered after blockchain confirmation');
      setFile(null);
      setDescription('');
      setHash('');
    } catch (error) {
      setTx({ status: 'error', hash: tx.hash, error: explainWalletError(error) });
      toast.error(explainWalletError(error));
    }
  };

  if (role === 'doctor') {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Only patients can register records. Doctors use authorized records after consent.
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Register a synthetic record</h1>
        <p className="text-muted-foreground mt-2">
          The file is encrypted off-chain. Only the SHA-256 hash is submitted to the contract after you sign the wallet
          transaction.
        </p>
      </div>

      {isDemo && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>Demo Mode active: Records will be anchored directly using the SHA-256 cryptographic relayer.</span>
          <span className="font-semibold px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10px]">Zero Wallet Required</span>
        </div>
      )}
      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Synthetic medical file</label>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input id="file-input" type="file" className="hidden" onChange={handleFileChange} />
              <label htmlFor="file-input" className="cursor-pointer block">
                <Cloud className="mx-auto mb-3 text-muted-foreground" />
                <p>{file ? file.name : 'Choose a demo PDF, text, or image file'}</p>
              </label>
            </div>
          </div>
          {hash && (
            <div className="rounded-lg border p-4 text-sm">
              <div className="flex gap-2">
                <CheckCircle className="text-primary" size={18} />
                <div>
                  <p className="font-medium">SHA-256</p>
                  <p className="font-mono break-all text-xs mt-1">{hash}</p>
                  <p className="text-muted-foreground text-xs mt-1">Short: {formatHash(hash)}</p>
                </div>
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Record type</label>
              <Input value={recordType} onChange={(e) => setRecordType(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Record date</label>
              <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description (off-chain only)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24" />
          </div>
          <Button type="submit" className="w-full" disabled={!file || !description || tx.status === 'pending'}>
            {tx.status === 'pending' ? 'Waiting for confirmation…' : 'Store file and register hash'}
          </Button>
        </form>
      </Card>
      <TxStatus tx={tx} />
    </div>
  );
}
