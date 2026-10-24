'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Hash,
  Database,
  Lock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Terminal,
  AlertTriangle,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { generateStringHash } from '@/lib/hash';

export default function FacultyGuidePage() {
  const [testText, setTestText] = useState('Diagnosis: Fasting Blood Sugar 168 mg/dL - Type 2 Diabetes');
  const [liveHash, setLiveHash] = useState('d433...live');

  // Compute live hash on input change
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTestText(val);
    try {
      const h = await generateStringHash(val);
      setLiveHash(h);
    } catch {
      // fallback
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-primary border-primary">
            Faculty Evaluation & Thesis Guide
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mt-2">
          Blockchain Integrity Verification in Healthcare (Pat-Doc)
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          Comprehensive technical defense, cryptographic foundations, architectural trust boundaries, and faculty
          demonstration script.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/dashboard/demo">
            <Button size="sm" className="gap-2">
              <ShieldCheck size={16} />
              Open Live Demonstration Lab
              <ArrowRight size={14} />
            </Button>
          </Link>
          <Link href="/dashboard/verify">
            <Button size="sm" variant="outline" className="gap-2">
              <FileCheck2 size={16} />
              Integrity Verification Console
            </Button>
          </Link>
        </div>
      </div>

      {/* Interactive Avalanche Effect Box */}
      <Card className="p-6 border-primary/30 bg-primary/5 dark:bg-primary/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Sparkles size={18} />
          Interactive Avalanche Effect Demonstration
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Type or modify just a single character below (for example, change &quot;168&quot; to &quot;169&quot; or add a
          period). Notice how more than 50% of the 256 output bits change completely.
        </p>
        <div className="space-y-2 text-xs">
          <label className="font-semibold text-muted-foreground">Sample Clinical Text:</label>
          <input
            type="text"
            className="w-full h-10 px-3 rounded-lg border bg-background font-mono text-xs focus:ring-2 focus:ring-primary outline-none"
            value={testText}
            onChange={handleInputChange}
          />
        </div>
        <div className="p-3 rounded-lg bg-background border font-mono text-[11px] space-y-1">
          <span className="text-[10px] text-muted-foreground font-sans uppercase font-bold block">
            Generated SHA-256 Digest (256 Bits):
          </span>
          <p className="text-primary font-bold break-all">{liveHash}</p>
        </div>
      </Card>

      {/* 6 Required Theoretical Topics */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen size={20} className="text-primary" />
          Core Cryptographic & Architectural Principles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Principle 1 */}
          <Card className="p-5 border space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Hash size={16} className="text-primary" />
              1. What is a Cryptographic Hash?
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A cryptographic hash function (SHA-256) is a one-way deterministic algorithm that takes arbitrary-sized input
              and outputs a unique fixed-length 256-bit hexadecimal string. It is computationally infeasible to invert (find
              the original text from the hash) or to find two different inputs that produce the same digest (collision resistance).
            </p>
          </Card>

          {/* Principle 2 */}
          <Card className="p-5 border space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Sparkles size={16} className="text-primary" />
              2. The Avalanche Effect
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A fundamental property of SHA-256: changing even a single bit in the canonical medical record (such as altering
              a medication dosage from &quot;500mg&quot; to &quot;50mg&quot; or changing blood sugar from &quot;168&quot; to
              &quot;68&quot;) causes an unpredictable, pseudo-random cascading shift across more than 50% of the resulting
              hash. This makes unauthorized alterations glaringly obvious.
            </p>
          </Card>

          {/* Principle 3 */}
          <Card className="p-5 border space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Database size={16} className="text-primary" />
              3. Why Database Hashes Are Insufficient
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Storing a hash alongside a medical record in the same editable relational/NoSQL database provides zero
              independent security. A malicious database administrator, compromised server process, or attacker with SQL
              injection can simply modify the medical record and update the stored hash simultaneously. Blockchain solves
              this by storing the trusted reference on an external, decentralized consensus ledger.
            </p>
          </Card>

          {/* Principle 4 */}
          <Card className="p-5 border space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Lock size={16} className="text-primary" />
              4. Smart Contract Permission Controls
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Solidity smart contract (<code className="text-primary font-mono">MedLedger</code>) enforces strict
              cryptographic ownership. Only the authorized account (<code className="font-mono">msg.sender == rec.owner</code>)
              can register records or publish amendments. Once recorded, previous version digests cannot be overwritten,
              erased, or updated without emitting transparent blockchain events.
            </p>
          </Card>

          {/* Principle 5 */}
          <Card className="p-5 border space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertTriangle size={16} className="text-primary" />
              5. What Blockchain Verification Proves & Doesn&apos;t Prove
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>What it proves:</strong> Mathematical integrity and non-repudiation. It guarantees that the data retrieved
              today is bit-for-bit identical to the data anchored at block time <em>T</em>.
              <br />
              <strong>What it does NOT prove:</strong> Clinical truth or medical accuracy (&quot;Garbage In, Immutable
              Garbage Out&quot;). If a clinician mistakenly types an incorrect diagnosis initially, the blockchain only proves
              that this specific error was recorded, not that the diagnosis was medically correct.
            </p>
          </Card>

          {/* Principle 6 */}
          <Card className="p-5 border space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Layers size={16} className="text-primary" />
              6. Why Sensitive Medical Data Remains Off-Chain
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Public blockchains are transparent and immutable. Storing patient names, diagnoses, or prescriptions on-chain
              would violate HIPAA, GDPR (Right to Erasure / Article 17), and patient privacy. In Pat-Doc, medical records are
              stored encrypted off-chain with AES-256-GCM, and only anonymous pseudonymous identifiers and 32-byte SHA-256 digests
              touch the smart contract.
            </p>
          </Card>
        </div>
      </div>

      {/* Step-by-Step Demonstration Script */}
      <Card className="p-6 border space-y-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Terminal size={18} />
            Step-by-Step Faculty Demonstration Script
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Follow these exact chronological steps during your viva / project evaluation:
          </p>
        </div>

        <div className="space-y-4 text-xs">
          {/* Step 1 */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-primary">Step 1: Create Synthetic Medical Record</span>
              <Badge variant="outline">Action A</Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Navigate to the <strong>Demonstration Lab</strong>. Click <strong>&quot;Create Test Record&quot;</strong>.
              Explain to the faculty that this creates a canonical structured medical record for synthetic patient{' '}
              <strong className="text-foreground">PAT-SYNTH-7842</strong>, computes its SHA-256 digest, and submits a transaction
              to anchor the digest on the Ethereum smart contract.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-primary">Step 2: Verify Initial Pristine State</span>
              <Badge variant="outline">Action B</Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Click <strong>&quot;Verify Original Record&quot;</strong>. Show that the calculated SHA-256 digest dynamically
              recalculated from the database fields matches the on-chain digest exactly. Point out the green{' '}
              <strong className="text-emerald-600">VERIFIED</strong> badge.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-amber-600">Step 3: Simulate Unauthorized Database Tampering</span>
              <Badge variant="outline">Action C</Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Click <strong>&quot;Simulate Unauthorized Tampering&quot;</strong>. Explain: an attacker has gained database access
              and maliciously modified Alice&apos;s diagnosis from <em>Type 2 Diabetes</em> to <em>Normal Profile</em> to pass an
              insurance physical, without executing an authorized smart contract amendment.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-red-600">Step 4: Prove Tamper Detection Live</span>
              <Badge variant="outline">Action D</Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Click <strong>&quot;Verify After Tampering&quot;</strong>. The system recalculates the SHA-256 hash from the modified
              data and compares it to the blockchain reference. Show the faculty the glowing red{' '}
              <strong className="text-red-600">TAMPERING DETECTED</strong> banner and the exact hash divergence.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-primary">Step 5: Restore to Pristine Baseline</span>
              <Badge variant="outline">Action E</Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Click <strong>&quot;Restore Test Record&quot;</strong>. The synthetic record is safely restored to its original
              snapshot and re-verified. Show that the status immediately returns to{' '}
              <strong className="text-emerald-600">VERIFIED</strong>.
            </p>
          </div>

          {/* Step 6 */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="text-indigo-600">Step 6: Demonstrate Authorized Version 2 Amendment</span>
              <Badge variant="outline">Action F</Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Click <strong>&quot;Demonstrate Authorized Amendment&quot;</strong>. Explain: when legitimate clinical updates occur,
              the doctor submits an authorized amendment. The smart contract appends Version 2 with a cryptographic link to
              Version 1 (<code className="font-mono">prevHash</code>). Show that Version 1 and Version 2 are both permanently
              preserved and independently verifiable!
            </p>
          </div>
        </div>
      </Card>

      {/* Terminal Proof Script */}
      <Card className="p-6 border border-primary/30 bg-primary/5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <Terminal size={18} />
          Standalone Terminal Proof — No Browser Required
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Faculty can independently verify tamper-detection from the command line in under 10 seconds.
          This runs real SHA-256 hashing and the in-memory smart contract emulator with identical cryptographic
          logic to the live app.
        </p>
        <div className="rounded-lg bg-zinc-900 text-zinc-100 p-4 font-mono text-xs space-y-1 leading-relaxed overflow-x-auto">
          <p className="text-zinc-500"># Run from the project root</p>
          <p><span className="text-emerald-400">$</span> npm run prove</p>
          <p className="text-zinc-400 mt-2">Expected output (exit code 0):</p>
          <p className="text-cyan-300">  STEP 3: VERIFY ORIGINAL RECORD</p>
          <p className="text-emerald-400">  ✅ PASS  SHA-256 digests MATCH — Record integrity VERIFIED</p>
          <p className="text-cyan-300 mt-1">  STEP 5: VERIFY AFTER TAMPERING</p>
          <p className="text-red-400">  ❌ FAIL  TAMPERING DETECTED — Smart contract rejected tampered state!</p>
          <p className="text-cyan-300 mt-1">  STEP 7: FINAL REPORT</p>
          <p className="text-emerald-400">  TEST RESULTS: 5/5 passed</p>
          <p className="text-emerald-300">  Avalanche Effect: ~55% of 256 bits flipped on single-field change</p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Source:{' '}
          <code className="font-mono bg-muted px-1 rounded">scripts/prove-tamper-detection.js</code> — standalone Node.js
          script using only the built-in <code className="font-mono bg-muted px-1 rounded">crypto</code> module. No external
          dependencies.
        </p>
      </Card>
    </div>
  );
}
