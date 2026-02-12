'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { generateFileHash, formatHash } from '@/lib/hash';
import { verifyRecord } from '@/lib/web3';
import { toast } from 'sonner';
import { Cloud, CheckCircle, AlertCircle } from 'lucide-react';

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedHash, setUploadedHash] = useState('');
  const [generatedHash, setGeneratedHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const fileHash = await generateFileHash(selectedFile);
      setGeneratedHash(fileHash);
      setVerificationResult(null);
    }
  };

  const handleVerify = async () => {
    if (!uploadedHash || !generatedHash) {
      toast.error('Please upload a file and enter the stored hash');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyRecord(uploadedHash, generatedHash);
      setVerificationResult(isValid);

      if (isValid) {
        toast.success('Record verified successfully!');
      } else {
        toast.error('Record verification failed - hashes do not match');
      }
    } catch (error) {
      toast.error('Verification error');
      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">Verify Record</h1>
        <p className="text-muted-foreground mt-2">
          Verify that your medical record has not been tampered with
        </p>
      </div>

      {/* Verification Form */}
      <Card className="p-8 border-border">
        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              Upload Record File
            </label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="verify-file-input"
                disabled={isVerifying}
              />
              <label htmlFor="verify-file-input" className="cursor-pointer block">
                <Cloud className="mx-auto mb-3 text-muted-foreground" size={40} />
                <p className="font-medium text-foreground">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select the same file you uploaded
                </p>
              </label>
            </div>
          </div>

          {/* Generated Hash Display */}
          {generatedHash && (
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Generated Hash (SHA-256)
              </label>
              <div className="p-4 bg-secondary rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-mono text-foreground break-all">
                      {generatedHash}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Short form: {formatHash(generatedHash)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stored Hash Input */}
          <div>
            <label htmlFor="stored-hash" className="block text-sm font-medium mb-2 text-foreground">
              Stored Hash (from blockchain)
            </label>
            <Input
              id="stored-hash"
              placeholder="Paste the hash stored on the blockchain..."
              value={uploadedHash}
              onChange={e => setUploadedHash(e.target.value)}
              disabled={isVerifying}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Get this from your medical records
            </p>
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={!uploadedHash || !generatedHash || isVerifying}
            size="lg"
            className="w-full"
          >
            {isVerifying ? 'Verifying...' : 'Verify Record'}
          </Button>

          {/* Verification Result */}
          {verificationResult !== null && (
            <div
              className={`p-6 rounded-lg border-2 ${
                verificationResult
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-4">
                {verificationResult ? (
                  <CheckCircle
                    className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                    size={24}
                  />
                ) : (
                  <AlertCircle
                    className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                    size={24}
                  />
                )}
                <div>
                  <h3
                    className={`font-semibold text-lg ${
                      verificationResult
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}
                  >
                    {verificationResult ? 'Record Verified' : 'Record Invalid'}
                  </h3>
                  <p
                    className={`text-sm mt-1 ${
                      verificationResult
                        ? 'text-green-700 dark:text-green-200'
                        : 'text-red-700 dark:text-red-200'
                    }`}
                  >
                    {verificationResult
                      ? 'The record hash matches the stored hash. The file has not been tampered with.'
                      : 'The hashes do not match. The record may have been modified.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
