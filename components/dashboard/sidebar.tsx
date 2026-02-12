'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useWeb3 } from '@/lib/web3-context';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Upload,
  Files,
  History,
  CheckCircle,
  LogOut,
} from 'lucide-react';
import { formatAddress } from '@/lib/web3';

export function Sidebar() {
  const pathname = usePathname();
  const { wallet, role, disconnect } = useWeb3();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['patient', 'doctor'] as const },
    { label: 'Upload Record', href: '/dashboard/upload', icon: Upload, roles: ['patient'] as const },
    {
      label: role === 'doctor' ? 'Records shared with me' : 'My Records',
      href: '/dashboard/records',
      icon: Files,
      roles: ['patient', 'doctor'] as const,
    },
    { label: 'Access Logs', href: '/dashboard/logs', icon: History, roles: ['patient', 'doctor'] as const },
    { label: 'Verify Record', href: '/dashboard/verify', icon: CheckCircle, roles: ['patient', 'doctor'] as const },
  ].filter((item) => role && item.roles.includes(role));

  return (
    <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-primary">MedLedger</h1>
        {role && (
          <p className="text-xs text-sidebar-foreground/70 mt-1 capitalize">
            Logged in as {role}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Wallet Info & Disconnect */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        {wallet.isConnected && (
          <div className="p-3 bg-sidebar-accent rounded-lg text-sm space-y-2">
            <p className="text-xs text-sidebar-foreground/60 uppercase">
              Connected Wallet ID
            </p>
            <div className="space-y-1">
              <p className="font-mono text-sidebar-accent-foreground font-semibold text-xs break-all">
                {wallet.address || ''}
              </p>
              <p className="font-mono text-sidebar-foreground/70 text-xs">
                Short: {formatAddress(wallet.address || '')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (wallet.address) {
                  navigator.clipboard.writeText(wallet.address);
                }
              }}
              className="w-full text-xs h-6"
            >
              Copy Full Address
            </Button>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="w-full"
        >
          <LogOut size={16} />
          Disconnect
        </Button>
      </div>
    </aside>
  );
}
