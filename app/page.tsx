'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWeb3 } from '@/lib/web3-context';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, Eye, UserCircle, Stethoscope } from 'lucide-react';

export default function Page() {
  const { wallet, role, setRole, isLoading, connect } = useWeb3();
  const router = useRouter();

  const handleSelectRole = (r: 'patient' | 'doctor') => {
    setRole(r);
  };

  const handleConnect = async () => {
    await connect();
  };

  const handleGetStarted = () => {
    if (wallet.isConnected && role) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">MedLedger</div>
          {wallet.isConnected && role && (
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Dashboard
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold text-balance text-foreground">
              Tamper-Proof Medical Records
              <span className="text-primary block">Powered by Web3</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Take control of your medical data. Secure, immutable records on the blockchain with complete patient consent and transparent access logs.
            </p>
          </div>

          {/* Step 1: Are you a Patient or Doctor? */}
          {!role && (
            <div className="space-y-4">
              <p className="text-lg font-medium text-foreground">
                Are you logging in as a Patient or Doctor?
              </p>
              <div className="flex gap-6 justify-center flex-wrap">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleSelectRole('patient')}
                  className="px-8 py-6 flex flex-col gap-2 h-auto"
                >
                  <UserCircle size={32} className="text-primary" />
                  <span>Patient</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Store & manage your records, grant access
                  </span>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleSelectRole('doctor')}
                  className="px-8 py-6 flex flex-col gap-2 h-auto"
                >
                  <Stethoscope size={32} className="text-primary" />
                  <span>Doctor</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    View records shared with you, check access logs
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Connect Wallet (after role selected) */}
          {role && !wallet.isConnected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Logging in as <span className="font-semibold text-foreground capitalize">{role}</span>. Connect your wallet to continue.
              </p>
              <Button
                size="lg"
                onClick={handleConnect}
                disabled={isLoading}
                className="px-8"
              >
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            </div>
          )}

          {/* Step 3: Get Started (after connected) */}
          {role && wallet.isConnected && (
            <div className="flex gap-4 justify-center flex-wrap">
              <p className="text-sm text-muted-foreground w-full">
                Connected as <span className="font-semibold text-foreground capitalize">{role}</span>. You can store/check data and access the dashboard.
              </p>
              <Button size="lg" onClick={handleGetStarted} className="px-8">
                Get Started
              </Button>
            </div>
          )}

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-12">
            <Card className="p-6 text-left border-border hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ShieldCheck className="text-primary" size={24} />
                </div>
                <h3 className="font-semibold text-lg">Immutable Records</h3>
              </div>
              <p className="text-muted-foreground">
                Your medical records are hashed and stored on the blockchain, making them tamper-proof and permanently recorded.
              </p>
            </Card>

            <Card className="p-6 text-left border-border hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lock className="text-primary" size={24} />
                </div>
                <h3 className="font-semibold text-lg">Patient Control</h3>
              </div>
              <p className="text-muted-foreground">
                You decide who can access your medical records. Grant or revoke access to healthcare providers at any time.
              </p>
            </Card>

            <Card className="p-6 text-left border-border hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Eye className="text-primary" size={24} />
                </div>
                <h3 className="font-semibold text-lg">Transparent Logs</h3>
              </div>
              <p className="text-muted-foreground">
                Every access to your records is logged and visible to you. Complete transparency in your healthcare data.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-muted-foreground">
          <p>MedLedger - Decentralized Medical Records Management</p>
          <p className="mt-2">Built for patient privacy and data integrity</p>
        </div>
      </footer>
    </div>
  );
}
