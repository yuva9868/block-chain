'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRecords } from '@/lib/records-context';
import { useWeb3 } from '@/lib/web3-context';
import { getRecordsSharedWith } from '@/lib/web3';
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

export default function DashboardPage() {
  const { records, accessLogs } = useRecords();
  const { wallet, role } = useWeb3();
  const router = useRouter();

  const isDoctor = role === 'doctor';
  const displayRecords = isDoctor && wallet.address
    ? getRecordsSharedWith(wallet.address)
    : records;

  const recentRecords = displayRecords.slice(0, 5);
  const recentLogs = accessLogs.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {isDoctor
            ? 'View records shared with you and access logs'
            : 'Welcome to your medical records management system'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {isDoctor ? 'Records shared with me' : 'Total Records'}
              </p>
              <p className="text-3xl font-bold text-primary mt-2">
                {displayRecords.length}
              </p>
            </div>
            <FileText className="text-primary/20" size={48} />
          </div>
        </Card>

        <Card className="p-6 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Access Granted</p>
              <p className="text-3xl font-bold text-primary mt-2">
                {accessLogs.filter(log => log.action === 'grant').length}
              </p>
            </div>
            <Lock className="text-primary/20" size={48} />
          </div>
        </Card>

        <Card className="p-6 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Access Views</p>
              <p className="text-3xl font-bold text-primary mt-2">
                {accessLogs.filter(log => log.action === 'view').length}
              </p>
            </div>
            <Eye className="text-primary/20" size={48} />
          </div>
        </Card>
      </div>

      {/* Recent Records */}
      <Card className="p-6 border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {isDoctor ? 'Recent records shared with me' : 'Recent Records'}
          </h2>
          {!isDoctor && (
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/records')}
            >
              View All
            </Button>
          )}
        </div>

        {recentRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRecords.map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.filename}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatHash(record.hash)}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(record.timestamp, {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium dark:bg-green-900 dark:text-green-100">
                        {record.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No records yet. Start by uploading your first medical record.</p>
          </div>
        )}
      </Card>

      {/* Recent Activity */}
      <Card className="p-6 border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Recent Activity</h2>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/logs')}
          >
            View All Logs
          </Button>
        </div>

        {recentLogs.length > 0 ? (
          <div className="space-y-4">
            {recentLogs.map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {log.action === 'grant' ? 'Access Granted' : 'Record Accessed'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {log.doctorName || log.accessedBy.slice(0, 10)}... •{' '}
                    {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    log.action === 'grant'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100'
                  }`}
                >
                  {log.action}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No activity yet</p>
          </div>
        )}
      </Card>
    </div>
  );
}
