'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRecords } from '@/lib/records-context';
import { formatHash } from '@/lib/hash';
import { formatDistanceToNow } from 'date-fns';
import { History } from 'lucide-react';

export default function LogsPage() {
  const { accessLogs } = useRecords();
  const [filterRecordId, setFilterRecordId] = useState('');
  const [filterAccessor, setFilterAccessor] = useState('');

  const filteredLogs = useMemo(() => {
    return accessLogs.filter(log => {
      const recordMatch = !filterRecordId ||
        log.recordId.toLowerCase().includes(filterRecordId.toLowerCase());
      const accessorMatch = !filterAccessor ||
        (log.doctorName?.toLowerCase().includes(filterAccessor.toLowerCase()) ||
          log.accessedBy
            .toLowerCase()
            .includes(filterAccessor.toLowerCase()));

      return recordMatch && accessorMatch;
    });
  }, [accessLogs, filterRecordId, filterAccessor]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">Access Logs</h1>
        <p className="text-muted-foreground mt-2">
          View all access history for your medical records
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6 border-border">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Filters</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Record ID
            </label>
            <Input
              placeholder="Filter by record ID..."
              value={filterRecordId}
              onChange={e => setFilterRecordId(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Accessed By
            </label>
            <Input
              placeholder="Filter by doctor name or address..."
              value={filterAccessor}
              onChange={e => setFilterAccessor(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Access Logs Table */}
      <Card className="p-6 border-border">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {accessLogs.length} entries
          </p>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Accessed By</TableHead>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {formatHash(log.recordId)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.accessedBy.slice(0, 10)}...
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.doctorName || '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          log.action === 'grant'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
                            : log.action === 'view'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100'
                              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100'
                        }`}
                      >
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <History className="mx-auto mb-3 opacity-30" size={40} />
            <p>No access logs found</p>
            <p className="text-sm mt-1">
              {filterRecordId || filterAccessor
                ? 'Try adjusting your filters'
                : 'No access activity yet'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
