'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useRecords } from '@/lib/records-context';
import { useWeb3 } from '@/lib/web3-context';
import { grantAccess, isValidAddress, getRecordsSharedWith } from '@/lib/web3';
import { formatHash } from '@/lib/hash';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Lock, Eye, FileText } from 'lucide-react';
import { DocumentViewer } from '@/components/dashboard/document-viewer';
import type { MedicalRecord } from '@/types';

export default function RecordsPage() {
  const { records, refreshLogs } = useRecords();
  const { wallet, role } = useWeb3();
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [doctorAddress, setDoctorAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);

  const isDoctor = role === 'doctor';
  const displayRecords = isDoctor && wallet.address
    ? getRecordsSharedWith(wallet.address)
    : records;

  useEffect(() => {
    if (wallet.address) setDoctorAddress(wallet.address);
  }, [wallet.address]);

  const handleGrantAccess = async () => {
    if (!selectedRecord) {
      toast.error('No record selected');
      return;
    }

    if (!doctorAddress || !isValidAddress(doctorAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    setIsLoading(true);
    try {
      const txHash = await grantAccess(selectedRecord, doctorAddress);
      refreshLogs();
      toast.success('Access granted successfully!', {
        description: `Transaction: ${txHash.slice(0, 10)}...`,
      });

      // Reset form (keep doctor wallet same as patient)
      setSelectedRecord(null);
      setDoctorAddress(wallet.address ?? '');
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Failed to grant access');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">
          {isDoctor ? 'Records shared with me' : 'My Records'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isDoctor
            ? 'Records that patients have granted you access to view'
            : 'View and manage access to your medical records'}
        </p>
      </div>

      {/* Records Table */}
      <Card className="p-6 border-border">
        {displayRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Hash</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Document</TableHead>
                  {!isDoctor && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRecords.map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-primary" />
                        {record.filename}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {record.description}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex flex-col">
                        <span className="text-xs">{formatHash(record.hash)}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          Full: {record.hash.slice(0, 8)}...{record.hash.slice(-8)}
                        </span>
                      </div>
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
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingRecord(record)}
                        disabled={!record.fileContent}
                        className="gap-2"
                      >
                        <Eye size={16} />
                        {record.fileContent ? 'View' : 'No file'}
                      </Button>
                    </TableCell>
                    {!isDoctor && (
                      <TableCell>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedRecord(record.id)}
                            >
                              <Lock size={16} />
                              Grant Access
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Grant Access</DialogTitle>
                              <DialogDescription>
                                Doctor wallet is the same as your connected
                                (patient) wallet. Pre-filled below.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Doctor&apos;s Wallet Address (same as patient)
                                </label>
                                <Input
                                  placeholder="0x..."
                                  value={doctorAddress}
                                  onChange={e => setDoctorAddress(e.target.value)}
                                  disabled={isLoading}
                                  className="font-mono text-sm"
                                />
                              </div>
                              <div className="bg-secondary p-3 rounded text-sm text-muted-foreground">
                                Record:{' '}
                                <span className="font-mono">
                                  {formatHash(record.hash)}
                                </span>
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  variant="outline"
                                  onClick={() => setIsDialogOpen(false)}
                                  disabled={isLoading}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleGrantAccess}
                                  disabled={isLoading || !doctorAddress}
                                >
                                  {isLoading ? 'Granting...' : 'Grant Access'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Lock className="mx-auto mb-3 opacity-30" size={40} />
            <p>{isDoctor ? 'No records shared with you yet' : 'No records yet'}</p>
            <p className="text-sm mt-1">
              {isDoctor
                ? 'Patients can grant you access from their My Records page'
                : 'Upload your first medical record to get started'}
            </p>
          </div>
        )}
      </Card>

      {/* Document Viewer */}
      {viewingRecord && (
        <DocumentViewer
          record={viewingRecord}
          isOpen={!!viewingRecord}
          onClose={() => setViewingRecord(null)}
        />
      )}
    </div>
  );
}
