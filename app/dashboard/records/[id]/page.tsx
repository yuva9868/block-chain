'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { explorerTxUrl, PUBLIC_CHAIN_NAME, PUBLIC_CONTRACT_ADDRESS } from '@/lib/config';
import { formatHash } from '@/lib/hash';
import type { MedicalRecord } from '@/types';

export default function RecordDetailPage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [verification, setVerification] = useState<{ status: string; onChainHash?: string; error?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch(`/api/records/${params.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 403) {
          setDenied(true);
          setError(data.error);
          return;
        }
        if (!res.ok) {
          setError(data.error || 'Unable to load record');
          return;
        }
        setRecord(data.record);
        setVerification(data.verification);
      })
      .catch(() => setError('Network error'));
  }, [params.id]);

  const download = async () => {
    const res = await fetch(`/api/records/${params.id}/file`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Download denied' }));
      setError(data.error);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record?.filename || 'record';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (denied) {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <p className="text-sm mt-4">
          If consent was revoked, future API access is blocked. Copies already saved on another device cannot be erased
          remotely.
        </p>
      </Card>
    );
  }

  if (!record) {
    return <p className="text-muted-foreground">{error || 'Loading record…'}</p>;
  }

  const txLink = record.txHash ? explorerTxUrl(record.txHash) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{record.filename}</h1>
        <p className="text-muted-foreground mt-2">{record.description}</p>
      </div>
      <Card className="p-6 space-y-3 text-sm">
        <p>Type: {record.recordType || '—'}</p>
        <p>Record date: {record.recordDate || '—'}</p>
        <p>Current version: Version {record.version || 1}</p>
        {record.diagnosis && (
          <div className="p-3 rounded bg-muted/40 space-y-1">
            <span className="font-semibold text-xs block text-muted-foreground uppercase">Diagnosis / Notes:</span>
            <p className="text-xs">{record.diagnosis}</p>
          </div>
        )}
        {record.treatment && (
          <div className="p-3 rounded bg-muted/40 space-y-1">
            <span className="font-semibold text-xs block text-muted-foreground uppercase">Treatment / Prescription:</span>
            <p className="text-xs">{record.treatment}</p>
          </div>
        )}
        <p className="font-mono break-all text-xs">SHA-256 Digest: {record.contentHash}</p>
        <p>Integrity: <span className="font-semibold capitalize">{verification?.status}</span> {verification?.error ? `— ${verification.error}` : ''}</p>
        {verification?.onChainHash && <p className="font-mono break-all text-xs">On-chain hash: {verification.onChainHash}</p>}
        <p>Network: {PUBLIC_CHAIN_NAME}</p>
        <p className="font-mono break-all text-xs">Contract: {PUBLIC_CONTRACT_ADDRESS || 'not configured'}</p>
        <p className="font-mono break-all text-xs">
          Transaction: {record.txHash || 'not confirmed'}
          {txLink && (
            <a className="ml-2 text-primary underline" href={txLink} target="_blank" rel="noreferrer">
              Explorer
            </a>
          )}
        </p>
        <p>Block: {record.blockNumber ?? '—'}</p>
        <p>
          Active grants:{' '}
          {(record.grants || []).filter((g) => !g.revokedAt).map((g) => g.address).join(', ') || 'none'}
        </p>

        {record.versions && record.versions.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <span className="font-semibold text-xs block">Version History Chain:</span>
            <div className="space-y-1 font-mono text-xs">
              {record.versions.map((v) => (
                <div key={v.version} className="p-2 border rounded bg-muted/20 space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-bold">Version {v.version}</span>
                    {v.prevHash && <span className="text-[10px] text-muted-foreground">Prev: {formatHash(v.prevHash)}</span>}
                  </div>
                  <p className="text-muted-foreground break-all">Hash: {v.contentHash}</p>
                  {v.reason && <p className="font-sans text-[10px] text-foreground/80 italic">{v.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button onClick={download}>Secure download</Button>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">Record id {formatHash(record.id)}</p>
    </div>
  );
}
