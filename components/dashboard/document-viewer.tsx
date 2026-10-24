'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { MedicalRecord } from '@/types';

export function DocumentViewer({
  record,
  isOpen,
  onClose,
}: {
  record: MedicalRecord;
  isOpen: boolean;
  onClose: () => void;
}) {
  const download = async () => {
    const res = await fetch(`/api/records/${record.id}/file`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{record.filename}</DialogTitle>
          <DialogDescription>Files are decrypted only after server-side authorization.</DialogDescription>
        </DialogHeader>
        <Button onClick={download}>Secure download</Button>
      </DialogContent>
    </Dialog>
  );
}
