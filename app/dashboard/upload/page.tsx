'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWeb3 } from '@/lib/web3-context';
import { useRecords } from '@/lib/records-context';
import { generateFileHash, formatHash } from '@/lib/hash';
import { addRecord } from '@/lib/web3';
import { toast } from 'sonner';
import { Cloud, CheckCircle } from 'lucide-react';

export default function UploadPage() {
  const { wallet, role } = useWeb3();
  const { refreshRecords } = useRecords();
  const isDoctor = role === 'doctor';
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [hash, setHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setHash('');

      // Generate hash
      const fileHash = await generateFileHash(selectedFile);
      setHash(fileHash);
      toast.success('File hash generated successfully');
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/png;base64, prefix if present
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !hash || !description) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!wallet.address) {
      toast.error('Wallet not connected');
      return;
    }

    setIsLoading(true);
    try {
      // Convert file to base64 for storage
      const fileContent = await fileToBase64(file);
      
      const result = await addRecord(
        hash,
        file.name,
        description,
        wallet.address!,
        fileContent,
        file.type,
        file.size
      );

      refreshRecords();
      toast.success('Record uploaded and stored successfully!', {
        description: `Transaction: ${result.txHash.slice(0, 10)}...`,
      });

      // Reset form
      setFile(null);
      setDescription('');
      setHash('');
      const fileInput = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      toast.error('Failed to upload record');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isDoctor) {
    return (
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Upload Record</h1>
          <p className="text-muted-foreground mt-2">
            Only patients can upload and store medical records
          </p>
        </div>
        <Card className="p-8 border-border text-center text-muted-foreground">
          <Cloud className="mx-auto mb-3 opacity-50" size={48} />
          <p>You are logged in as a doctor. Use &quot;Records shared with me&quot; to view records patients have granted you access to.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">Upload Record</h1>
        <p className="text-muted-foreground mt-2">
          Upload your medical record to the blockchain
        </p>
      </div>

      {/* Form */}
      <Card className="p-8 border-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Medical Record File
            </label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
                disabled={isLoading}
              />
              <label htmlFor="file-input" className="cursor-pointer block">
                <Cloud className="mx-auto mb-3 text-muted-foreground" size={40} />
                <p className="font-medium text-foreground">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, DOCX, or other file formats
                </p>
              </label>
            </div>
          </div>

          {/* Hash Display */}
          {hash && (
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                File Hash (SHA-256) - Document Integrity Code
              </label>
              <div className="p-4 bg-secondary rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      Full Hash (64 characters):
                    </p>
                    <p className="text-sm font-mono text-foreground break-all bg-background p-2 rounded border border-border">
                      {hash}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Short form: <span className="font-mono">{formatHash(hash)}</span>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Hash generated successfully - Document is ready to store
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2 text-foreground">
              Record Description
            </label>
            <Textarea
              id="description"
              placeholder="e.g., Chest X-Ray examination report from Dr. Smith"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isLoading}
              className="min-h-24"
            />
          </div>

          {/* Wallet Address Display */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Patient Wallet Address
            </label>
            <div className="relative">
              <Input
                type="text"
                value={wallet.address || ''}
                disabled
                className="font-mono text-sm pr-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 text-xs"
                onClick={() => {
                  if (wallet.address) {
                    navigator.clipboard.writeText(wallet.address);
                    toast.success('Wallet address copied!');
                  }
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your unique wallet ID: {wallet.address?.slice(0, 10)}...{wallet.address?.slice(-8)}
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!file || !description || isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? 'Uploading...' : 'Upload Record'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
