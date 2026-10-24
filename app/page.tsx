'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWeb3 } from '@/lib/web3-context';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, Eye, UserCircle, Stethoscope, Hash, Database, Link2 } from 'lucide-react';
import { useState } from 'react';
import type { UserRole } from '@/types';

export default function Page() {
  const { wallet, role, isLoading, error, chain, connect, connectDemo, hasWallet } = useWeb3();
  const router = useRouter();
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  const handleConnect = async (selected: UserRole) => {
    setPendingRole(selected);
    try {
      if (hasWallet) {
        await connect(selected);
      } else {
        await connectDemo(selected);
      }
      router.push('/dashboard');
    } catch {
      setPendingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-primary">MedLedger</div>
            <p className="text-xs text-muted-foreground">Integrity registry for medical records</p>
          </div>
          {wallet.isConnected && role && (
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Open dashboard
            </Button>
          )}
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <p className="text-sm font-medium text-primary">College-ready blockchain demonstration</p>
            <h1 className="text-4xl sm:text-5xl font-semibold text-foreground leading-tight text-balance">
              Patient-controlled medical record integrity, with hashes on-chain and files off-chain.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Hospitals and patients need a way to detect tampering without publishing diagnoses on a public ledger.
              MedLedger stores only a record identifier, SHA-256 hash, owner wallet, and consent grants on Ethereum-compatible networks.
            </p>
            {!chain.configured && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-4 text-sm">
                Blockchain is not configured. Deploy the contract and set <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> before
                registering records. Wallet login still requires a local node or testnet RPC.
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                disabled={isLoading}
                onClick={() => handleConnect('patient')}
                className="h-auto py-4 px-6 justify-start"
              >
                <UserCircle className="mr-2" />
                {isLoading && pendingRole === 'patient' ? 'Waiting for wallet…' : 'Continue as demo patient'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={isLoading}
                onClick={() => handleConnect('doctor')}
                className="h-auto py-4 px-6 justify-start"
              >
                <Stethoscope className="mr-2" />
                {isLoading && pendingRole === 'doctor' ? 'Waiting for wallet…' : 'Continue as demo doctor'}
              </Button>
            </div>
            {!hasWallet && (
              <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800 p-4 text-sm flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-semibold shrink-0">Demo mode</span>
                <span className="text-blue-700 dark:text-blue-300">
                  No wallet detected — buttons will log you in with a pre-set demo address. Install MetaMask to use your own wallet.
                </span>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              A wallet signature proves control of an address. It is not proof of a medical license. Use synthetic demo files
              only.
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <h2 className="font-semibold">How integrity verification works</h2>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li>1. A synthetic file is hashed with SHA-256 in the browser and again on the server.</li>
              <li>2. The encrypted file is stored off-chain. Names and diagnoses never go into the contract.</li>
              <li>3. The patient wallet registers the hash on the MedLedger contract and waits for confirmation.</li>
              <li>4. Later, the same file is hashed again and compared with the on-chain value.</li>
            </ol>
            <div className="rounded-md bg-secondary p-4 text-xs font-mono leading-relaxed">
              Patient / Doctor → Frontend → Authenticated API → Encrypted files
              <br />
              Frontend / API → RPC / wallet → MedLedger contract → Blockchain
            </div>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          {[
            {
              icon: ShieldCheck,
              title: 'Tamper evidence',
              body: 'A changed file produces a different SHA-256 digest and a mismatch against the registered hash.',
            },
            {
              icon: Lock,
              title: 'Patient consent',
              body: 'Doctors retrieve files only after an on-chain grant. Revocation is enforced by the API and the contract.',
            },
            {
              icon: Eye,
              title: 'Honest audit trail',
              body: 'On-chain events are labeled separately from server logs. Transaction hashes come from the network, never generators.',
            },
          ].map((item) => (
            <Card key={item.title} className="p-6">
              <item.icon className="text-primary mb-3" />
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {[
            { icon: Hash, title: 'Step 1', body: 'Connect a wallet and sign in as patient or doctor.' },
            { icon: Database, title: 'Step 2', body: 'Register a synthetic record hash on the local chain or testnet.' },
            { icon: Link2, title: 'Step 3', body: 'Grant, verify, tamper-test, then revoke and confirm denial.' },
          ].map((item) => (
            <Card key={item.title} className="p-6">
              <item.icon className="text-primary mb-3" />
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-muted-foreground space-y-2">
          <p>MedLedger is an academic demonstration. It is not a certified medical device and is not HIPAA/GDPR certified.</p>
          <p>
            Network: {chain.chainName} ({chain.chainId})
            {chain.contractAddress ? ` · Contract ${chain.contractAddress}` : ' · contract not configured'}
          </p>
        </div>
      </footer>
    </div>
  );
}
