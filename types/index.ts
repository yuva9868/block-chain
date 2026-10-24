export type UserRole = 'patient' | 'doctor';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}

export interface RecordVersionItem {
  version: number;
  contentHash: string;
  prevHash?: string;
  canonicalString?: string;
  diagnosis?: string;
  treatment?: string;
  actor: string;
  timestamp: number;
  txHash?: string;
  blockNumber?: number;
  reason?: string;
}

export interface MedicalRecord {
  id: string;
  ownerAddress?: string;
  contentHash?: string;
  filename: string;
  description: string;
  recordType?: string;
  recordDate?: string;
  mimeType?: string;
  size?: number;
  createdAt?: number;
  status: 'pending_chain' | 'registered' | 'failed' | 'active';
  txHash?: string;
  blockNumber?: number;
  patientId?: string;
  doctorId?: string;
  diagnosis?: string;
  treatment?: string;
  version?: number;
  canonicalString?: string;
  isSyntheticDemo?: boolean;
  versions?: RecordVersionItem[];
  ipfsCID?: string;
  hash?: string;
  timestamp?: number;
  patientAddress?: string;
  grants?: {
    address: string;
    grantedAt: number;
    grantTxHash?: string;
    revokedAt?: number;
    revokeTxHash?: string;
  }[];
  verification?: {
    status: 'verified' | 'mismatch' | 'unavailable' | 'not_registered' | 'pending';
    onChainHash?: string;
    calculatedHash?: string;
    error?: string;
    lastVerified?: number;
  };
}

export interface AuditLog {
  id: string;
  timestamp: number;
  action: string;
  actor?: string;
  recordId?: string;
  source?: 'on-chain' | 'off-chain';
  txHash?: string;
  details?: string;
  prevHash?: string;
  entryHash?: string;
  accessedBy?: string;
  doctorName?: string;
  hash?: string;
}

export type AccessLog = AuditLog;

export interface ChainEvent {
  event: string;
  txHash: string;
  blockNumber: number;
  recordId: string;
  owner: string;
  grantee?: string;
  contentHash?: string;
  registeredAt?: number;
}

export interface TxState {
  status: 'idle' | 'pending' | 'confirmed' | 'rejected' | 'reverted' | 'error';
  hash?: string;
  error?: string;
}
