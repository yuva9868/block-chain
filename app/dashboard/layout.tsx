'use client';

import { ReactNode, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { useWeb3 } from '@/lib/web3-context';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { wallet, role } = useWeb3();
  const router = useRouter();

  // Redirect to home if wallet not connected or role not set
  useEffect(() => {
    if (!wallet.isConnected || !role) {
      router.push('/');
    }
  }, [wallet.isConnected, role, router]);

  if (!wallet.isConnected || !role) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
