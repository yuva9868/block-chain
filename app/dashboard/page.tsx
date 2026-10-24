'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRecords } from '@/lib/records-context';
import { useWeb3 } from '@/lib/web3-context';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatHash } from '@/lib/hash';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Lock, Eye } from 'lucide-react';

function statusLabel(status?: string) {
  if (status === 'verified') return 'Verified';
  if (status === 'mismatch') return 'Mismatch';
  if (status === 'unavailable') return 'Verification unavailable';
  return 'Pending on-chain';
}

export default function DashboardPage() {
  const { records, accessLogs, loading, error } = useRecords();
  const { role, chain } = useWeb3();
  const router = useRouter();
  const isDoctor = role === 'doctor';
  const recentRecords = records.slice(0, 5);
  const recentLogs = accessLogs.slice(0, 5);
  const activeGrants = records.reduce(
    (count, record) => count + (record.grants || []).filter((g) => !g.revokedAt).length,
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{isDoctor ? 'Doctor dashboard' : 'Patient dashboard'}</h1>
          <p className="text-muted-foreground mt-2">
            Counts below come from the authenticated API and live Ethereum smart contract.
          </p>
          {!chain.configured && (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
              Contract address is not configured. Start the local node with <code className="font-mono">npx hardhat node</code> and deploy.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/dashboard/demo')} className="gap-2 bg-primary">
            <Lock size={15} />
            Demonstration Lab
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/faculty-guide')}>
            Faculty Guide
          </Button>
        </div>
      </div>

      {/* Faculty Demo Feature Banner */}
      <Card className="p-6 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-background flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-primary uppercase tracking-wider">Evaluation Ready</span>
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">Live Viva Lab</span>
          </div>
          <h3 className="text-lg font-bold">Tamper-Proof Medical Record Verification Lab</h3>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Live demonstration with synthetic test patient PAT-SYNTH-7842. Test real blockchain record creation, SHA-256
            canonical hashing, simulated unauthorized database tampering, instant tamper detection, and authorized versioning.
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/demo')} size="sm" className="shrink-0">
          Open Demo Lab &rarr;
        </Button>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{isDoctor ? 'Authorized records' : 'Registered records'}</p>
          <p className="text-3xl font-semibold mt-2">{loading ? '—' : records.length}</p>
          <FileText className="text-primary/30 mt-3" />
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{isDoctor ? 'Active consents' : 'Doctors currently granted'}</p>
          <p className="text-3xl font-semibold mt-2">{loading ? '—' : activeGrants}</p>
          <Lock className="text-primary/30 mt-3" />
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Audit entries</p>
          <p className="text-3xl font-semibold mt-2">{loading ? '—' : accessLogs.length}</p>
          <Eye className="text-primary/30 mt-3" />
        </Card>
      </div>

      {!isDoctor && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => router.push('/dashboard/upload')}>Register a record</Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/verify')}>
            Verify integrity
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/demo')}>
            Tamper Demo Lab
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/records')}>
            Manage consent
          </Button>
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent records</h2>
          <Button variant="outline" onClick={() => router.push('/dashboard/records')}>
            View all
          </Button>
        </div>
        {recentRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {isDoctor ? 'No patient has granted this wallet access yet.' : 'No records yet. Register a synthetic file to begin.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>Integrity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.filename}</TableCell>
                  <TableCell className="font-mono text-xs">{formatHash(record.contentHash)}</TableCell>
                  <TableCell>{statusLabel(record.verification?.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent access activity</h2>
          <Button variant="outline" onClick={() => router.push('/dashboard/logs')}>
            Audit trail
          </Button>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No audit events for this session yet.</p>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex justify-between gap-4 border rounded-lg p-3 text-sm">
                <div>
                  <p className="font-medium">{log.action.replaceAll('_', ' ')}</p>
                  <p className="text-muted-foreground text-xs">
                    {log.source} · {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{log.source}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
