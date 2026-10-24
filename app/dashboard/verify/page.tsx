'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecords } from '@/lib/records-context';
import { generateFileHash, formatHash } from '@/lib/hash';
import { explorerTxUrl, PUBLIC_CHAIN_NAME, PUBLIC_CONTRACT_ADDRESS } from '@/lib/config';
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Layers,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  Lock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type VerificationStatus = 'VERIFIED' | 'TAMPERING DETECTED' | 'NOT REGISTERED' | 'VERIFICATION ERROR';

type Result = {
  status: 'verified' | 'mismatch' | 'not_registered' | 'unavailable';
  storedHash?: string;
  calculatedHash?: string;
  onChainHash?: string | null;
  uploadedHash?: string | null;
  txHash?: string;
  blockNumber?: number;
  registeredAt?: number;
  contractOwner?: string;
  recordVersion?: number;
  versionHistory?: {
    version: number;
    contentHash: string;
    prevHash?: string;
    diagnosis?: string;
    treatment?: string;
    timestamp?: number;
    reason?: string;
  }[];
  networkName?: string;
  contractAddress?: string;
  lastVerified?: number;
  error?: string;
};

export default function BlockchainIntegrityVerificationPage() {
  const { records } = useRecords();
  const [recordId, setRecordId] = useState(records[0]?.id || '');
  const [selectedVersion, setSelectedVersion] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [localHash, setLocalHash] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedRecord = records.find((r) => r.id === recordId);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    if (!next) return;
    setFile(next);
    setLocalHash(await generateFileHash(next));
    setResult(null);
  };

  const verify = async () => {
    if (!recordId) return;
    setBusy(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('recordId', recordId);
      if (selectedVersion) form.append('version', String(selectedVersion));
      if (file) form.append('file', file);

      const res = await fetch('/api/verify', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setResult({ status: 'unavailable', error: data.error || 'Server error' });
        return;
      }
      setResult(data);
    } catch {
      setResult({ status: 'unavailable', error: 'Could not reach the blockchain RPC endpoint' });
    } finally {
      setBusy(false);
    }
  };

  // Map to the exact required 4 labels:
  // VERIFIED, TAMPERING DETECTED, NOT REGISTERED, VERIFICATION ERROR
  const getDisplayStatus = (status?: string): VerificationStatus => {
    if (status === 'verified') return 'VERIFIED';
    if (status === 'mismatch') return 'TAMPERING DETECTED';
    if (status === 'not_registered') return 'NOT REGISTERED';
    return 'VERIFICATION ERROR';
  };

  const displayStatus = result ? getDisplayStatus(result.status) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Blockchain Integrity Verification</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          Verify medical records against immutable on-chain cryptographic anchors. An external blockchain ledger provides
          independent, non-repudiable proof that records have not been altered or tampered with.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Verification Controls */}
        <div className="md:col-span-5 space-y-6">
          <Card className="p-6 space-y-5 border shadow-sm">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              Select Record to Verify
            </h2>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Authorized Medical Record
                </label>
                <select
                  className="w-full border rounded-lg h-10 px-3 bg-background text-sm"
                  value={recordId}
                  onChange={(e) => {
                    setRecordId(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="">Choose a medical record…</option>
                  {records.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.filename} ({r.patientId || 'patient'}) - V{r.version || 1}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRecord && selectedRecord.versions && selectedRecord.versions.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Target Version
                  </label>
                  <select
                    className="w-full border rounded-lg h-10 px-3 bg-background text-sm"
                    value={selectedVersion}
                    onChange={(e) => {
                      setSelectedVersion(e.target.value ? Number(e.target.value) : '');
                      setResult(null);
                    }}
                  >
                    <option value="">Latest Version (V{selectedRecord.version || 1})</option>
                    {selectedRecord.versions.map((v) => (
                      <option key={v.version} value={v.version}>
                        Version {v.version} {v.reason ? `— ${v.reason}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 border-t">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Optional Document / File to Compare
                </label>
                <input
                  type="file"
                  onChange={onFile}
                  className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                />
                {localHash && (
                  <p className="font-mono text-[11px] mt-2 text-muted-foreground break-all">
                    Local SHA-256: {localHash}
                  </p>
                )}
              </div>

              <Button onClick={verify} disabled={!recordId || busy} className="w-full gap-2">
                <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
                {busy ? 'Querying Blockchain…' : 'Run Integrity Check'}
              </Button>
            </div>
          </Card>

          {/* Educational Note */}
          <Card className="p-5 border bg-muted/30 text-xs space-y-2 leading-relaxed">
            <h3 className="font-semibold text-foreground flex items-center gap-1.5">
              <Lock size={14} className="text-primary" />
              Cryptographic Proof Boundary
            </h3>
            <p className="text-muted-foreground">
              A database-only check is vulnerable to an attacker who has database write access, because they could modify
              both the record and its stored hash simultaneously.
            </p>
            <p className="text-muted-foreground">
              By registering the SHA-256 digest on an immutable Ethereum smart contract, undetected database alterations
              become mathematically impossible.
            </p>
          </Card>
        </div>

        {/* Verification Report Display */}
        <div className="md:col-span-7 space-y-6">
          <Card className="p-6 border shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="font-semibold text-base">Verification Report</h2>
                <p className="text-xs text-muted-foreground">Detailed smart contract integrity check results</p>
              </div>

              {displayStatus && (
                <Badge
                  className={`text-xs px-3 py-1 font-bold ${
                    displayStatus === 'VERIFIED'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : displayStatus === 'TAMPERING DETECTED'
                        ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                        : displayStatus === 'NOT REGISTERED'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {displayStatus}
                </Badge>
              )}
            </div>

            {result ? (
              <div className="space-y-4 text-xs">
                {/* Result Status Banner */}
                <div
                  className={`p-4 rounded-lg border flex items-start gap-3 ${
                    displayStatus === 'VERIFIED'
                      ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                      : displayStatus === 'TAMPERING DETECTED'
                        ? 'border-red-300 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200'
                        : displayStatus === 'NOT REGISTERED'
                          ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                          : 'border-purple-300 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200'
                  }`}
                >
                  {displayStatus === 'VERIFIED' ? (
                    <ShieldCheck size={24} className="shrink-0 text-emerald-600" />
                  ) : displayStatus === 'TAMPERING DETECTED' ? (
                    <ShieldAlert size={24} className="shrink-0 text-red-600" />
                  ) : (
                    <AlertCircle size={24} className="shrink-0 text-amber-600" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{displayStatus}</p>
                    <p className="leading-relaxed opacity-90">
                      {displayStatus === 'VERIFIED'
                        ? 'The current record contents match the trusted smart contract digest. Integrity is mathematically proven.'
                        : displayStatus === 'TAMPERING DETECTED'
                          ? 'The current record contents do not match the trusted blockchain reference. Unauthorized modification has been detected!'
                          : displayStatus === 'NOT REGISTERED'
                            ? 'No trusted reference hash has been anchored to the blockchain for this record.'
                            : result.error || 'The blockchain verification service could not complete the check.'}
                    </p>
                  </div>
                </div>

                {/* Audit & Record Details Table */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded bg-muted/40 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Medical Record ID</span>
                    <p className="font-mono text-xs truncate">{recordId}</p>
                  </div>

                  <div className="p-3 rounded bg-muted/40 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Record Reference</span>
                    <p className="font-semibold text-xs truncate">
                      {selectedRecord?.filename || 'Clinical Consultation'}
                    </p>
                  </div>

                  <div className="p-3 rounded bg-muted/40 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Record Version</span>
                    <p className="font-semibold text-xs">
                      Version {result.recordVersion || selectedRecord?.version || 1}
                    </p>
                  </div>

                  <div className="p-3 rounded bg-muted/40 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Last Verified</span>
                    <p className="font-semibold text-xs">
                      {result.lastVerified ? new Date(result.lastVerified).toLocaleTimeString() : 'Just now'}
                    </p>
                  </div>
                </div>

                {/* Hash Comparison Section */}
                <div className="space-y-2 pt-2 border-t">
                  <h3 className="font-semibold text-xs text-foreground uppercase tracking-wide">
                    Cryptographic Digest Comparison
                  </h3>

                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded bg-muted/50 border space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block font-sans font-medium">
                        Current Calculated Hash (From DB Content):
                      </span>
                      <p
                        className={`break-all ${
                          displayStatus === 'TAMPERING DETECTED'
                            ? 'text-red-600 font-bold'
                            : 'text-foreground'
                        }`}
                      >
                        {result.calculatedHash || selectedRecord?.contentHash || 'N/A'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-muted/50 border space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block font-sans font-medium">
                        Trusted On-Chain Hash (From Smart Contract):
                      </span>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold break-all">
                        {result.onChainHash || 'Not available'}
                      </p>
                    </div>

                    {result.storedHash && (
                      <div className="p-2.5 rounded bg-muted/50 border space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block font-sans font-medium">
                          Original Database Stored Hash:
                        </span>
                        <p className="text-muted-foreground break-all">{result.storedHash}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Blockchain Network & Smart Contract Metadata */}
                <div className="space-y-2 pt-2 border-t">
                  <h3 className="font-semibold text-xs text-foreground uppercase tracking-wide">
                    Blockchain Network Metadata
                  </h3>

                  <div className="p-3 rounded bg-muted/40 text-[11px] space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">Network:</span>
                      <span className="font-semibold">{result.networkName || PUBLIC_CHAIN_NAME}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">Contract Address:</span>
                      <span className="truncate max-w-[220px]">
                        {result.contractAddress || PUBLIC_CONTRACT_ADDRESS || 'Local MedLedger'}
                      </span>
                    </div>
                    {result.blockNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-sans">Anchored Block:</span>
                        <span>#{result.blockNumber}</span>
                      </div>
                    )}
                    {result.txHash && (
                      <div className="flex justify-between items-center pt-1 border-t">
                        <span className="text-muted-foreground font-sans">Transaction Hash:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[150px]">{formatHash(result.txHash)}</span>
                          {explorerTxUrl(result.txHash) && (
                            <a
                              href={explorerTxUrl(result.txHash)!}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-0.5 text-[10px]"
                            >
                              Explorer <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Version History Progression */}
                {result.versionHistory && result.versionHistory.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <h3 className="font-semibold text-xs text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Layers size={14} className="text-primary" />
                      Tamper-Evident Version History Chain
                    </h3>
                    <div className="space-y-1.5">
                      {result.versionHistory.map((ver) => (
                        <div key={ver.version} className="p-2.5 rounded border bg-background font-mono text-[11px] space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-primary">Version {ver.version}</span>
                            {ver.prevHash && (
                              <span className="text-[10px] text-muted-foreground">
                                Prev: {formatHash(ver.prevHash)}
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground break-all text-[10px]">Hash: {ver.contentHash}</p>
                          {ver.reason && <p className="font-sans text-[10px] text-foreground/80 italic">{ver.reason}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground text-xs space-y-2">
                <HelpCircle size={32} className="mx-auto opacity-50" />
                <p>Select a medical record and click &quot;Run Integrity Check&quot;.</p>
                <p>Results will display on-chain digests, calculated hashes, and verification status.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
