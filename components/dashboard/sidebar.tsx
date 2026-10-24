'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useWeb3 } from '@/lib/web3-context';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Upload,
  Files,
  History,
  CheckCircle,
  LogOut,
  Activity,
  Menu,
  ShieldCheck,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { formatAddress } from '@/lib/web3';
import type { UserRole } from '@/types';

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role } = useWeb3();
  const navItems: { label: string; href: string; icon: typeof LayoutDashboard; roles: readonly UserRole[]; highlight?: boolean }[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['patient', 'doctor'] },
    { label: 'Demonstration Lab', href: '/dashboard/demo', icon: ShieldCheck, roles: ['patient', 'doctor'], highlight: true },
    { label: 'Register record', href: '/dashboard/upload', icon: Upload, roles: ['patient'] },
    {
      label: role === 'doctor' ? 'Authorized records' : 'My records',
      href: '/dashboard/records',
      icon: Files,
      roles: ['patient', 'doctor'],
    },
    { label: 'Verify integrity', href: '/dashboard/verify', icon: CheckCircle, roles: ['patient', 'doctor'] },
    { label: 'Blockchain activity', href: '/dashboard/activity', icon: Activity, roles: ['patient', 'doctor'] },
    { label: 'Audit trail', href: '/dashboard/logs', icon: History, roles: ['patient', 'doctor'] },
    { label: 'Faculty Guide', href: '/dashboard/faculty-guide', icon: BookOpen, roles: ['patient', 'doctor'] },
  ];

  const visibleItems = navItems.filter((item) => (role ? item.roles.includes(role) : false));

  return (
    <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
              isActive
                ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/40'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400 transition-colors'} />
              <span>{item.label}</span>
            </div>
            {item.highlight && !isActive && (
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded">
                <Sparkles size={10} /> Live
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function WalletFooter() {
  const { wallet, role, chain, disconnect } = useWeb3();
  return (
    <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/60">
      {wallet.isConnected && (
        <div className="p-3 bg-slate-800/90 border border-slate-700/70 rounded-lg text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wider font-bold text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              {role}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {chain.configured ? chain.chainName : 'Demo Mode'}
            </span>
          </div>
          <p className="font-mono text-[11px] text-slate-300 break-all leading-tight">
            {formatAddress(wallet.address || '')}
          </p>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => disconnect()}
        className="w-full text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 justify-center gap-2 font-medium"
      >
        <LogOut size={15} />
        Sign out
      </Button>
    </div>
  );
}

export function Sidebar() {
  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 text-slate-100 flex-col h-screen sticky top-0 shrink-0 shadow-xl z-20">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-900/40">
              M
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">MedLedger</h1>
              <p className="text-[11px] text-slate-400 font-medium">Integrity &amp; Consent Hub</p>
            </div>
          </div>
        </div>
        <NavLinks />
        <WalletFooter />
      </aside>

      {/* Mobile Top Header & Drawer */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white shadow-md">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
            M
          </div>
          <span className="font-bold text-white tracking-tight">MedLedger</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label="Open navigation menu"
              className="text-slate-200 border-slate-700 bg-slate-800/80 hover:bg-slate-800 hover:text-white gap-2 font-medium"
            >
              <Menu size={16} />
              <span>Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col h-full">
            <div className="p-5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white">
                  M
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-white">MedLedger</h1>
                  <p className="text-[11px] text-slate-400">Integrity &amp; Consent Hub</p>
                </div>
              </div>
            </div>
            <NavLinks />
            <WalletFooter />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
