'use client';

import { ReactNode, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { useWeb3 } from '@/lib/web3-context';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { wallet, role, sessionReady } = useWeb3();
  const router = useRouter();

  useEffect(() => {
    if (sessionReady && (!wallet.isConnected || !role)) {
      router.push('/');
    }
  }, [sessionReady, wallet.isConnected, role, router]);

  if (!sessionReady || !wallet.isConnected || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Checking MedLedger session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="md:flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
