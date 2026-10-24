'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRecords } from '@/lib/records-context';
import { formatHash } from '@/lib/hash';
import { formatDistanceToNow } from 'date-fns';
import { ShieldCheck, ShieldAlert, RefreshCw, Link2, Lock, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function LogsPage() {
  const { accessLogs, refreshLogs } = useRecords();
  const [filter, setFilter] = useState('');
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const verifyChain = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      setChainValid(Boolean(data.chainIntegrity));
      if (data.chainIntegrity) {
        toast.success(`Cryptographic audit chain verified! ${data.entries?.length || 0} sequential links intact.`);
      } else {
        toast.error('Audit chain validation failed: Hash linkage broken!');
      }
    } catch {
      toast.error('Could not verify audit chain.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    verifyChain();
  }, [accessLogs.length]);

  const filtered = useMemo(
    () =>
      accessLogs.filter(
        (log) =>
          !filter ||
          log.action.toLowerCase().includes(filter.toLowerCase()) ||
          (log.actor || log.accessedBy || '').toLowerCase().includes(filter.toLowerCase()) ||
          log.details?.toLowerCase().includes(filter.toLowerCase())
      ),
    [accessLogs, filter]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tamper-Evident Audit Trail</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl leading-relaxed">
            Every clinical event, blockchain anchor, access grant, integrity check, and tampering detection is
            cryptographically logged into a SHA-256 hash chain.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {chainValid !== null && (
            <Badge
              className={`text-xs px-3 py-1 font-semibold flex items-center gap-1.5 ${
                chainValid
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
              }`}
            >
              {chainValid ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              {chainValid ? 'Chain Intact (Verified)' : 'Chain Compromised'}
            </Badge>
          )}

          <Button variant="outline" size="sm" onClick={verifyChain} disabled={checking} className="gap-2">
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            Verify Chain
          </Button>
        </div>
      </div>

      {/* Trust Assumptions Card */}
      <Card className="p-5 border bg-muted/30 text-xs space-y-2 leading-relaxed">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Info size={15} className="text-primary" />
          Audit Trust Assumptions & Cryptographic Architecture
        </div>
        <p className="text-muted-foreground">
          <strong>On-chain events</strong> (registrations, amendments, consent grants) are permanently secured by Ethereum consensus.
          <strong> Off-chain audit events</strong> (logins, file downloads, verification checks, simulated tampering attempts) are
          chained sequentially using SHA-256 (<code className="font-mono">entryHash = SHA256(prevHash | timestamp | action | actor | ...)</code>).
        </p>
        <p className="text-muted-foreground">
          An attacker cannot modify or delete past entries without invalidating every subsequent entry&apos;s hash. Trust assumptions
          remain on server process isolation and database administration permissions.
        </p>
      </Card>

      {/* Search & Filter */}
      <Card className="p-4">
        <Input
          placeholder="Filter audit logs by action, actor, or details (e.g. 'amendment', 'tampering', '0x7099...')"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs"
        />
      </Card>

      {/* Audit Log Table */}
      <Card className="overflow-x-auto shadow-sm">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No audit entries found matching the filter.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Time</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Actor / Account</TableHead>
                <TableHead>Cryptographic Hash Link</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id} className="text-xs">
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-medium px-2 py-0.5 rounded text-[11px] ${
                        log.action.includes('tamper')
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 font-bold'
                          : log.action.includes('amendment')
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
                            : log.action.includes('verification')
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-muted text-foreground'
                      }`}
                    >
                      {log.action.replaceAll('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {log.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">{formatHash(log.actor || log.accessedBy)}</TableCell>
                  <TableCell className="font-mono text-[10px]">
                    <div className="flex items-center gap-1 text-muted-foreground" title={`Entry: ${log.entryHash}`}>
                      <Link2 size={12} className="text-primary shrink-0" />
                      <span>{log.entryHash ? formatHash(log.entryHash) : '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground text-[11px]" title={log.details}>
                    {log.details || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
