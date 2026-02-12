export type UserRole = 'patient' | 'doctor';

export interface MedicalRecord {
  id: string;
  ipfsCID: string;
  hash: string;
  timestamp: number;
  status: 'active' | 'archived';
  patientAddress: string;
  filename: string;
  description: string;
  fileContent?: string; // Base64 encoded file content
  fileType?: string; // MIME type (e.g., 'application/pdf', 'image/png')
  fileSize?: number; // File size in bytes
}

export interface AccessLog {
  id: string;
  recordId: string;
  accessedBy: string;
  timestamp: number;
  action: 'view' | 'grant' | 'revoke';
  doctorName?: string;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}
