'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatHash } from '@/lib/hash';
import { Download, X, FileText, Image, File } from 'lucide-react';
import { MedicalRecord } from '@/types';

interface DocumentViewerProps {
  record: MedicalRecord;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewer({ record, isOpen, onClose }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!record.fileContent) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Not Available</DialogTitle>
            <DialogDescription>
              This record does not have a stored document file.
            </DialogDescription>
          </DialogHeader>
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 opacity-50" size={48} />
            <p>Document content is not available for this record.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getFileIcon = () => {
    if (!record.fileType) return <File size={24} />;
    if (record.fileType.startsWith('image/')) return <Image size={24} />;
    if (record.fileType.includes('pdf')) return <FileText size={24} />;
    return <File size={24} />;
  };

  const downloadFile = () => {
    if (!record.fileContent) return;
    
    setIsLoading(true);
    try {
      const base64 = record.fileContent;
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: record.fileType || 'application/octet-stream' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = record.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileUrl = () => {
    if (!record.fileContent) return '';
    const base64 = record.fileContent;
    const mimeType = record.fileType || 'application/octet-stream';
    return `data:${mimeType};base64,${base64}`;
  };

  const isImage = record.fileType?.startsWith('image/');
  const isPDF = record.fileType?.includes('pdf');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {getFileIcon()}
                {record.filename}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {record.description}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadFile}
                disabled={isLoading}
              >
                <Download size={16} />
                Download
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X size={16} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg bg-secondary/50 p-4">
          {isImage ? (
            <div className="flex justify-center">
              <img
                src={getFileUrl()}
                alt={record.filename}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          ) : isPDF ? (
            <iframe
              src={getFileUrl()}
              className="w-full h-[70vh] border-0"
              title={record.filename}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[70vh] text-muted-foreground">
              <FileText className="mb-4 opacity-50" size={64} />
              <p className="text-lg font-medium">Preview not available</p>
              <p className="text-sm mt-2">
                File type: {record.fileType || 'Unknown'}
              </p>
              <p className="text-sm">
                Size: {record.fileSize ? `${(record.fileSize / 1024).toFixed(2)} KB` : 'Unknown'}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={downloadFile}
                disabled={isLoading}
              >
                <Download size={16} className="mr-2" />
                Download to view
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-secondary rounded-lg border border-border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Document Hash (SHA-256)</p>
              <p className="font-mono text-xs mt-1 break-all">{formatHash(record.hash)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Record ID</p>
              <p className="font-mono text-xs mt-1 break-all">{formatHash(record.id)}</p>
            </div>
            {record.fileSize && (
              <div>
                <p className="text-muted-foreground text-xs">File Size</p>
                <p className="text-xs mt-1">
                  {record.fileSize < 1024
                    ? `${record.fileSize} bytes`
                    : `${(record.fileSize / 1024).toFixed(2)} KB`}
                </p>
              </div>
            )}
            {record.fileType && (
              <div>
                <p className="text-muted-foreground text-xs">File Type</p>
                <p className="text-xs mt-1">{record.fileType}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
