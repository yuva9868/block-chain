import { WalletState, MedicalRecord, AccessLog } from '@/types';
import type { UserRole } from '@/types';
import { generateMockIPFSCID, generateMockRecordId } from './mock-data';

const STORAGE_KEY = 'medledger_wallet_state';
const ROLE_KEY = 'medledger_user_role';
const RECORDS_KEY = 'medledger_records';
const LOGS_KEY = 'medledger_access_logs';

/**
 * Get wallet state from localStorage
 */
export function getWalletState(): WalletState {
  if (typeof window === 'undefined') {
    return { address: null, isConnected: false, chainId: null };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { address: null, isConnected: false, chainId: null };
    }
  }
  return { address: null, isConnected: false, chainId: null };
}

/**
 * Save wallet state to localStorage
 */
function saveWalletState(state: WalletState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Same mock address for both patient and doctor wallet
const MOCK_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f6bEb1';

/**
 * Get the doctor wallet address (same as connected patient wallet)
 */
export function getDoctorWalletAddress(): string | null {
  return getWalletState().address;
}

/**
 * Simulate wallet connection
 * In a real app, this would use ethers.js or web3.js.
 * Patient and doctor use the same connected wallet.
 */
export async function connectWallet(): Promise<WalletState> {
  // Simulate a small delay for wallet connection
  await new Promise(resolve => setTimeout(resolve, 1000));

  const walletState: WalletState = {
    address: MOCK_WALLET_ADDRESS,
    isConnected: true,
    chainId: 1,
  };

  saveWalletState(walletState);
  return walletState;
}

/**
 * Disconnect wallet
 */
export function disconnectWallet(): void {
  const emptyState: WalletState = {
    address: null,
    isConnected: false,
    chainId: null,
  };
  saveWalletState(emptyState);
}

/**
 * Add medical record to mock blockchain
 */
export async function addRecord(
  hash: string,
  filename: string,
  description: string,
  patientAddress: string,
  fileContent?: string,
  fileType?: string,
  fileSize?: number
): Promise<{ id: string; ipfsCID: string; txHash: string }> {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const record: MedicalRecord = {
    id: generateMockRecordId(),
    ipfsCID: generateMockIPFSCID(),
    hash,
    timestamp: Date.now(),
    status: 'active',
    patientAddress,
    filename,
    description,
    fileContent,
    fileType,
    fileSize,
  };

  // Save to localStorage (simulating blockchain storage)
  const records = getRecords();
  records.push(record);
  if (typeof window !== 'undefined') {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }

  // Add access log entry
  const logs = getAccessLogs();
  logs.push({
    id: Math.random().toString(),
    recordId: record.id,
    accessedBy: patientAddress,
    timestamp: Date.now(),
    action: 'view',
  });
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }

  return {
    id: record.id,
    ipfsCID: record.ipfsCID,
    txHash: '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join(''),
  };
}

/**
 * Grant access to a record
 */
export async function grantAccess(
  recordId: string,
  doctorAddress: string
): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 1000));

  const logs = getAccessLogs();
  logs.push({
    id: Math.random().toString(),
    recordId,
    accessedBy: doctorAddress,
    timestamp: Date.now(),
    action: 'grant',
    doctorName: `Dr. ${Math.random().toString(36).substring(7)}`,
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }

  return '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

/**
 * Get all records for the current patient
 */
export function getRecords(): MedicalRecord[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(RECORDS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get all access logs
 */
export function getAccessLogs(): AccessLog[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(LOGS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Get/set user role (patient | doctor)
 */
export function getUserRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  const r = localStorage.getItem(ROLE_KEY);
  if (r === 'patient' || r === 'doctor') return r;
  return null;
}

export function setUserRole(role: UserRole): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROLE_KEY, role);
}

export function clearUserRole(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ROLE_KEY);
}

/**
 * Get records shared with a doctor (access granted to this address)
 */
export function getRecordsSharedWith(doctorAddress: string): MedicalRecord[] {
  if (!doctorAddress) return [];
  const logs = getAccessLogs();
  const recordIds = new Set<string>();
  for (const log of logs) {
    if (log.accessedBy?.toLowerCase() === doctorAddress.toLowerCase()) {
      recordIds.add(log.recordId);
    }
  }
  const allRecords = getRecords();
  return allRecords.filter((r) => recordIds.has(r.id));
}

/**
 * Verify if a record hash is valid (not tampered)
 */
export async function verifyRecord(
  storedHash: string,
  uploadedHash: string
): Promise<boolean> {
  // Simulate verification delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return storedHash.toLowerCase() === uploadedHash.toLowerCase();
}

/**
 * Initialize mock data (call once on app startup)
 */
export function initializeMockData(): void {
  if (typeof window === 'undefined') return;

  const existingRecords = localStorage.getItem(RECORDS_KEY);
  const existingLogs = localStorage.getItem(LOGS_KEY);

  if (!existingRecords) {
    const { MOCK_MEDICAL_RECORDS } = require('./mock-data');
    localStorage.setItem(RECORDS_KEY, JSON.stringify(MOCK_MEDICAL_RECORDS));
  }

  if (!existingLogs) {
    const { MOCK_ACCESS_LOGS } = require('./mock-data');
    localStorage.setItem(LOGS_KEY, JSON.stringify(MOCK_ACCESS_LOGS));
  }
}

/**
 * Format Ethereum address for display
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

/**
 * Format full wallet address with clear separators
 */
export function formatFullAddress(address: string): string {
  if (!address) return '';
  // Format as: 0x742d-35Cc-6634-C053-2925-a3b8-44Bc-9e75-95f6-bEb1
  const withoutPrefix = address.slice(2);
  const chunks = withoutPrefix.match(/.{1,4}/g) || [];
  return `0x${chunks.join('-')}`;
}

/**
 * Check if valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
