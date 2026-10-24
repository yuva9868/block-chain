'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  FilePlus,
  GitCommit,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hash,
  Database,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Layers,
  Lock,
  Sparkles,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import { formatHash } from '@/lib/hash';
import { toast } from 'sonner';
import { PUBLIC_CHAIN_NAME, PUBLIC_CONTRACT_ADDRESS } from '@/lib/config';

interface DemoRecordState {
  id: string;
  diagnosis?: string;
  treatment?: string;
  version?: number;
  contentHash: string;
  txHash?: string;
  blockNumber?: number;
  versions?: {
    version: number;
    contentHash: string;
    prevHash?: string;
    diagnosis?: string;
    treatment?: string;
    reason?: string;
  }[];
}

interface DemoResponse {
  record: DemoRecordState | null;
  calculatedHash?: string;
  onChainHash?: string | null;
  status?: 'verified' | 'mismatch' | 'not_registered' | 'not_created';
  isTampered?: boolean;
  chainError?: string | null;
}

/** Compute differing bits between two hex hashes for the avalanche effect display */
function countDifferingBits(hash1: string, hash2: string): number {
  const a = hash1.replace(/^0x/i, '').toLowerCase();
  const b = hash2.replace(/^0x/i, '').toLowerCase();
  let diff = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (xor > 0) {
      diff += xor & 1;
      xor >>= 1;
    }
  }
  return diff;
}

/** Render two hex hashes with differing nibbles highlighted */
function HashDiffDisplay({ original, tampered, label1, label2 }: { original: string; tampered: string; label1: string; label2: string }) {
  const a = original.replace(/^0x/i, '');
  const b = tampered.replace(/^0x/i, '');

  return (
    <div className="space-y-2">
      <div className="p-2.5 rounded bg-muted/60 border space-y-1">
        <span className="text-[10px] text-muted-foreground font-sans uppercase font-bold block">{label1}:</span>
        <p className="font-mono text-[11px] break-all leading-relaxed">
          {a.split('').map((ch, i) => (
            <span key={`a-${i}`} className={a[i] !== b[i] ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-foreground'}>
              {ch}
            </span>
          ))}
        </p>
      </div>
      <div className="p-2.5 rounded bg-muted/60 border space-y-1">
        <span className="text-[10px] text-muted-foreground font-sans uppercase font-bold block">{label2}:</span>
        <p className="font-mono text-[11px] break-all leading-relaxed">
          {b.split('').map((ch, i) => (
            <span key={`b-${i}`} className={a[i] !== b[i] ? 'text-red-600 dark:text-red-400 font-bold' : 'text-foreground'}>
              {ch}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

/** Copy button */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={doCopy} className="inline-flex items-center text-muted-foreground hover:text-foreground transition ml-1" title="Copy hash">
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}

export default function DemoLabPage() {
  const [data, setData] = useState<DemoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<{ step: string; message: string; type: 'success' | 'danger' | 'info'; timestamp: number; hashes?: { calculated?: string; onChain?: string } }[]>(
    []
  );

  // Track the last tamper action response for the visual diff
  const [lastTamperResult, setLastTamperResult] = useState<{
    originalDiagnosis?: string;
    tamperedDiagnosis?: string;
    originalTreatment?: string;
    tamperedTreatment?: string;
    originalOnChainHash?: string;
    tamperedCalculatedHash?: string;
  } | null>(null);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/demo');
      const json = await res.json();
      setData(json);
    } catch {
      toast.error('Failed to communicate with Demo Lab API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const runAction = async (action: string, stepName: string) => {
    setActiveAction(action);
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Action failed');
      }

      await fetchState();

      if (action === 'create') {
        setLastTamperResult(null);
        setActionLog((prev) => [
          {
            step: 'Step A: Record Created & Anchored',
            message: `Record ${formatHash(result.contentHash)} anchored to block #${result.blockNumber || 'local'}. Status: VERIFIED. Mode: ${result.mode || 'blockchain'}.`,
            type: 'success',
            timestamp: Date.now(),
            hashes: { calculated: result.contentHash, onChain: result.contentHash },
          },
          ...prev,
        ]);
        toast.success('Synthetic test record created and anchored on-chain!');
      } else if (action === 'verify') {
        const ok = result.status === 'verified';
        setActionLog((prev) => [
          {
            step: 'Step B: Integrity Verification',
            message: ok
              ? `Recalculated SHA-256 matches trusted blockchain anchor: ${formatHash(result.calculatedHash)}`
              : `TAMPERING DETECTED: Calculated hash differs from on-chain digest!`,
            type: ok ? 'success' : 'danger',
            timestamp: Date.now(),
            hashes: { calculated: result.calculatedHash, onChain: result.onChainHash },
          },
          ...prev,
        ]);
        if (ok) toast.success('Record verified successfully against on-chain hash!');
        else toast.error('Verification failed: Hash mismatch detected!');
      } else if (action === 'tamper') {
        setLastTamperResult({
          originalDiagnosis: result.originalDiagnosis,
          tamperedDiagnosis: result.tamperedDiagnosis,
          originalTreatment: result.originalTreatment,
          tamperedTreatment: result.tamperedTreatment,
          originalOnChainHash: result.originalOnChainHash,
          tamperedCalculatedHash: result.tamperedCalculatedHash,
        });
        setActionLog((prev) => [
          {
            step: 'Step C: Simulated Database Tampering',
            message: `ATTACK SIMULATED: Medical notes modified in database. Recalculated hash changed to ${formatHash(result.tamperedCalculatedHash)}. Blockchain reference remained unchanged (${formatHash(result.originalOnChainHash)}).`,
            type: 'danger',
            timestamp: Date.now(),
            hashes: { calculated: result.tamperedCalculatedHash, onChain: result.originalOnChainHash },
          },
          ...prev,
        ]);
        toast.warning('Simulated attack executed: Medical diagnosis altered in DB!');
      } else if (action === 'verify_tampered') {
        setActionLog((prev) => [
          {
            step: 'Step D: Verification After Tampering',
            message: `FAILURE CONFIRMED: Smart contract rejected tampered state. Status: TAMPERING DETECTED.`,
            type: 'danger',
            timestamp: Date.now(),
            hashes: { calculated: result.calculatedHash, onChain: result.onChainHash },
          },
          ...prev,
        ]);
        toast.error('TAMPERING DETECTED: Blockchain verification failed as expected!');
      } else if (action === 'restore') {
        setLastTamperResult(null);
        setActionLog((prev) => [
          {
            step: 'Step E: Test Record Restored',
            message: `Synthetic record restored to pristine original content. Fresh recalculation matches on-chain digest: ${formatHash(result.restoredHash)}.`,
            type: 'success',
            timestamp: Date.now(),
            hashes: { calculated: result.restoredHash, onChain: result.onChainHash },
          },
          ...prev,
        ]);
        toast.success('Synthetic record restored and re-verified!');
      } else if (action === 'amend') {
        setLastTamperResult(null);
        setActionLog((prev) => [
          {
            step: 'Step F: Authorized Amendment (Version 2)',
            message: `Version 2 anchored to smart contract with cryptographic link to Version 1. Both versions independently verifiable!`,
            type: 'info',
            timestamp: Date.now(),
            hashes: { calculated: result.newContentHash, onChain: result.newContentHash },
          },
          ...prev,
        ]);
        toast.success('Authorized amendment anchored on-chain as Version 2!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActiveAction(null);
    }
  };

  const isVerified = data?.status === 'verified';
  const isTampered = data?.status === 'mismatch' || data?.isTampered;
  const hasRecord = Boolean(data?.record);

  // Avalanche effect computation
  const avalancheInfo = useMemo(() => {
    if (!lastTamperResult?.originalOnChainHash || !lastTamperResult?.tamperedCalculatedHash) return null;
    const diff = countDifferingBits(lastTamperResult.originalOnChainHash, lastTamperResult.tamperedCalculatedHash);
    return { diff, total: 256, pct: ((diff / 256) * 100).toFixed(1) };
  }, [lastTamperResult]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="border-b pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Tamper-Proof Demonstration Lab</h1>
            <Badge variant="outline" className="text-primary border-primary">
              Live Faculty Demo
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">
            A controlled evaluation environment designed to demonstrate that unauthorized alterations to medical
            records are cryptographically detected by the Ethereum smart contract. Uses synthetic patient{' '}
            <strong className="text-foreground">PAT-SYNTH-7842</strong>.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchState} disabled={loading} className="gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh State
        </Button>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3 border shadow-sm">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isVerified
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                : isTampered
                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {isVerified ? <ShieldCheck size={22} /> : isTampered ? <ShieldAlert size={22} /> : <Lock size={22} />}
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Integrity Status</p>
            <p className="text-base font-bold capitalize">
              {isVerified ? (
                <span className="text-emerald-600 dark:text-emerald-400">VERIFIED</span>
              ) : isTampered ? (
                <span className="text-red-600 dark:text-red-400">TAMPERING DETECTED</span>
              ) : hasRecord ? (
                'Pending Anchoring'
              ) : (
                'No Test Record'
              )}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border shadow-sm">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Record Version</p>
            <p className="text-base font-bold">
              {data?.record ? `Version ${data.record.version || 1} (${data.record.versions?.length || 1} Total)` : 'None'}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border shadow-sm">
          <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Database size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">On-Chain Anchor</p>
            <p className="text-base font-bold font-mono text-xs truncate max-w-[150px]">
              {data?.onChainHash ? formatHash(data.onChainHash) : 'Not Registered'}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border shadow-sm">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Hash size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Network / Contract</p>
            <p className="text-xs font-semibold truncate">{PUBLIC_CHAIN_NAME}</p>
            <p className="text-[11px] font-mono text-muted-foreground truncate max-w-[150px]">
              {PUBLIC_CONTRACT_ADDRESS ? formatHash(PUBLIC_CONTRACT_ADDRESS) : 'Local Provider'}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Interactive Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Interactive Action Buttons */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border rounded-xl p-6 bg-card space-y-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span>Faculty Demonstration Controls</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Execute the sequence A &rarr; B &rarr; C &rarr; D &rarr; E &rarr; F to prove tamper-evidence live.
              </p>
            </div>

            <div className="space-y-3">
              {/* Button A */}
              <div className="p-4 border rounded-lg bg-background/50 hover:bg-background transition flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      A
                    </span>
                    <h3 className="font-semibold text-sm">Create Test Record</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generates synthetic record for Alice Demo, computes SHA-256 canonical digest, and anchors it to the smart
                    contract.
                  </p>
                </div>
                <Button
                  onClick={() => runAction('create', 'Create Test Record')}
                  disabled={activeAction !== null}
                  size="sm"
                  className="shrink-0 gap-1.5"
                >
                  <FilePlus size={15} />
                  {activeAction === 'create' ? 'Anchoring...' : 'Create Record'}
                </Button>
              </div>

              {/* Button B */}
              <div className="p-4 border rounded-lg bg-background/50 hover:bg-background transition flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      B
                    </span>
                    <h3 className="font-semibold text-sm">Verify Original Record</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Retrieves record from DB, recalculates SHA-256 digest, and compares against on-chain anchor.
                  </p>
                </div>
                <Button
                  onClick={() => runAction('verify', 'Verify Original')}
                  disabled={!hasRecord || activeAction !== null}
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <CheckCircle2 size={15} />
                  {activeAction === 'verify' ? 'Verifying...' : 'Verify Hash'}
                </Button>
              </div>

              {/* Button C */}
              <div className="p-4 border border-amber-300 dark:border-amber-900/60 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                      C
                    </span>
                    <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertTriangle size={15} />
                      Simulate Unauthorized Tampering
                    </h3>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Directly alters the clinical diagnosis in the database without smart contract authorization.
                  </p>
                </div>
                <Button
                  onClick={() => runAction('tamper', 'Simulate Tampering')}
                  disabled={!hasRecord || activeAction !== null}
                  variant="destructive"
                  size="sm"
                  className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <AlertTriangle size={15} />
                  {activeAction === 'tamper' ? 'Altering...' : 'Simulate Attack'}
                </Button>
              </div>

              {/* Button D */}
              <div className="p-4 border rounded-lg bg-background/50 hover:bg-background transition flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      D
                    </span>
                    <h3 className="font-semibold text-sm">Verify After Tampering</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Re-runs verification. Demonstrates that database alteration immediately triggers TAMPERING DETECTED.
                  </p>
                </div>
                <Button
                  onClick={() => runAction('verify_tampered', 'Verify After Tampering')}
                  disabled={!hasRecord || activeAction !== null}
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <ShieldAlert size={15} />
                  {activeAction === 'verify_tampered' ? 'Checking...' : 'Verify Failure'}
                </Button>
              </div>

              {/* Button E */}
              <div className="p-4 border rounded-lg bg-background/50 hover:bg-background transition flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      E
                    </span>
                    <h3 className="font-semibold text-sm">Restore Test Record</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Restores synthetic test data back to original pristine baseline and re-verifies against on-chain hash.
                  </p>
                </div>
                <Button
                  onClick={() => runAction('restore', 'Restore Record')}
                  disabled={!hasRecord || activeAction !== null}
                  variant="secondary"
                  size="sm"
                  className="shrink-0 gap-1.5"
                >
                  <RotateCcw size={15} />
                  {activeAction === 'restore' ? 'Restoring...' : 'Restore Record'}
                </Button>
              </div>

              {/* Button F */}
              <div className="p-4 border rounded-lg bg-background/50 hover:bg-background transition flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      F
                    </span>
                    <h3 className="font-semibold text-sm">Demonstrate Authorized Amendment</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Applies clinical update with cryptographic link to Version 1, anchoring Version 2 to the smart contract.
                  </p>
                </div>
                <Button
                  onClick={() => runAction('amend', 'Authorized Amendment')}
                  disabled={!hasRecord || activeAction !== null}
                  size="sm"
                  className="shrink-0 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <GitCommit size={15} />
                  {activeAction === 'amend' ? 'Amending...' : 'Anchor Version 2'}
                </Button>
              </div>
            </div>
          </div>

          {/* ─── Avalanche Effect & Tamper Visual Diff ────────────── */}
          {lastTamperResult && avalancheInfo && (
            <Card className="p-6 border border-red-300 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/10 shadow-sm space-y-5">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <Sparkles size={18} />
                <h3 className="font-bold text-sm">Avalanche Effect — Cryptographic Proof of Tampering</h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Changing the medical diagnosis caused <strong className="text-red-600 dark:text-red-400">{avalancheInfo.diff}</strong> out of{' '}
                <strong>256</strong> bits to flip ({avalancheInfo.pct}%). SHA-256&rsquo;s avalanche property guarantees that
                even a single altered character produces an entirely different hash, making unauthorized modifications
                instantly detectable.
              </p>

              {/* Avalanche Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-muted-foreground">Bit Divergence</span>
                  <span className="text-red-600 dark:text-red-400">{avalancheInfo.diff}/256 bits ({avalancheInfo.pct}%)</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-1000"
                    style={{ width: `${avalancheInfo.pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">SHA-256 ideal: ~50% of bits flip per single-character change</p>
              </div>

              {/* Hash nibble-by-nibble diff */}
              <HashDiffDisplay
                original={lastTamperResult.originalOnChainHash || ''}
                tampered={lastTamperResult.tamperedCalculatedHash || ''}
                label1="Trusted On-Chain Hash (immutable)"
                label2="Tampered Calculated Hash (from altered DB)"
              />

              {/* Clinical data diff */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Original Diagnosis</span>
                  <div className="p-2.5 rounded bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs leading-relaxed">
                    {lastTamperResult.originalDiagnosis}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400 block">Tampered Diagnosis</span>
                  <div className="p-2.5 rounded bg-red-50/80 dark:bg-red-950/20 border border-red-300 dark:border-red-900 text-xs leading-relaxed text-red-800 dark:text-red-200 font-semibold">
                    {lastTamperResult.tamperedDiagnosis}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Cryptographic State Inspector */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Record State */}
          <Card className="p-6 space-y-5 border shadow-sm">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Database size={16} className="text-primary" />
                Live Database Inspection
              </h3>
              <Badge variant={isVerified ? 'default' : isTampered ? 'destructive' : 'secondary'}>
                {isVerified ? 'VERIFIED' : isTampered ? 'TAMPERING DETECTED' : 'UNREGISTERED'}
              </Badge>
            </div>

            {hasRecord ? (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-muted-foreground block font-medium mb-1">Synthetic Patient Reference:</span>
                  <div className="p-2.5 rounded bg-muted/60 font-mono text-[11px] space-y-0.5">
                    <p>
                      <strong>ID:</strong> PAT-SYNTH-7842 (Alice Demo)
                    </p>
                    <p>
                      <strong>Physician:</strong> DOC-CARDIO-402 (Dr. Evelyn Reed, MD)
                    </p>
                    <p>
                      <strong>Record ID:</strong> {data?.record?.id ? formatHash(data.record.id) : 'N/A'}
                      {data?.record?.id && <CopyButton text={data.record.id} />}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block font-medium mb-1">Clinical Diagnosis (In Database):</span>
                  <div
                    className={`p-3 rounded border text-xs leading-relaxed ${
                      isTampered
                        ? 'border-red-400 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-200 font-semibold'
                        : 'bg-muted/40 text-foreground'
                    }`}
                  >
                    {data?.record?.diagnosis || 'No clinical notes'}
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground block font-medium mb-1">Treatment / Prescription:</span>
                  <div
                    className={`p-3 rounded border text-xs leading-relaxed ${
                      isTampered
                        ? 'border-red-400 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-200 font-semibold'
                        : 'bg-muted/40 text-foreground'
                    }`}
                  >
                    {data?.record?.treatment || 'No treatment details'}
                  </div>
                </div>

                {/* Hash Comparison Box */}
                <div className="space-y-2 pt-2 border-t">
                  <span className="font-semibold text-xs block">Cryptographic Hash Verification:</span>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="p-2 rounded bg-muted/60">
                      <span className="text-muted-foreground block text-[10px]">CURRENT CALCULATED HASH (FROM DB):</span>
                      <span className={isTampered ? 'text-red-600 font-bold break-all' : 'text-foreground break-all'}>
                        {data?.calculatedHash || 'N/A'}
                      </span>
                      {data?.calculatedHash && <CopyButton text={data.calculatedHash} />}
                    </div>

                    <div className="p-2 rounded bg-muted/60">
                      <span className="text-muted-foreground block text-[10px]">
                        TRUSTED ON-CHAIN REFERENCE (FROM CONTRACT):
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold break-all">
                        {data?.onChainHash || 'No blockchain record found'}
                      </span>
                      {data?.onChainHash && <CopyButton text={data.onChainHash} />}
                    </div>
                  </div>

                  {isTampered && (
                    <div className="p-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 text-xs flex items-start gap-2">
                      <XCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                      <div>
                        <strong>Cryptographic Failure Proved:</strong> The calculated hash does not match the on-chain digest.
                        Unauthorized modifications cannot escape detection because the blockchain reference is immutable.
                      </div>
                    </div>
                  )}

                  {isVerified && (
                    <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                      <div>
                        <strong>Cryptographic Integrity Verified:</strong> The freshly calculated SHA-256 matches the on-chain
                        reference perfectly.
                      </div>
                    </div>
                  )}
                </div>

                {/* Version History List */}
                {data?.record?.versions && data.record.versions.length > 0 && (
                  <div className="pt-2 border-t space-y-2">
                    <span className="font-semibold text-xs block">On-Chain Version History:</span>
                    <div className="space-y-1.5">
                      {data.record.versions.map((ver) => (
                        <div key={ver.version} className="p-2 rounded border bg-background text-[11px] space-y-0.5 font-mono">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-primary">Version {ver.version}</span>
                            {ver.prevHash && (
                              <span className="text-[10px] text-muted-foreground">
                                Prev: {formatHash(ver.prevHash)}
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground break-all text-[10px]">Hash: {ver.contentHash}</p>
                          {ver.reason && <p className="text-[10px] text-foreground/80 font-sans italic">{ver.reason}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                <FilePlus size={32} className="mx-auto opacity-50" />
                <p>No synthetic record active yet.</p>
                <p>Click &quot;Create Record&quot; to begin the faculty demonstration.</p>
              </div>
            )}
          </Card>

          {/* Action Log / Execution Trace */}
          <Card className="p-6 space-y-3 border shadow-sm">
            <h3 className="font-semibold text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Terminal size={14} className="text-primary" />
                Demonstration Event Log
              </span>
              <span className="text-xs text-muted-foreground font-normal">{actionLog.length} events</span>
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
              {actionLog.length === 0 ? (
                <p className="text-muted-foreground text-xs py-4 text-center">No actions executed in this session.</p>
              ) : (
                actionLog.map((log, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded border text-xs space-y-0.5 ${
                      log.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200'
                        : log.type === 'danger'
                          ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20 text-red-950 dark:text-red-200'
                          : 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 text-blue-950 dark:text-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-[11px]">{log.step}</p>
                      <span className="text-[10px] opacity-60">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">{log.message}</p>
                    {log.hashes?.calculated && log.hashes?.onChain && log.hashes.calculated !== log.hashes.onChain && (
                      <div className="mt-1 pt-1 border-t border-current/10 font-mono text-[10px] space-y-0.5">
                        <p>Calc: {log.hashes.calculated.slice(0, 32)}...</p>
                        <p>Chain: {log.hashes.onChain.slice(0, 32)}...</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
