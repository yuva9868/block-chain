import { MedicalRecord, AccessLog } from '@/types';

export const MOCK_CONTRACT_ABI = [
  {
    constant: false,
    inputs: [{ name: 'recordHash', type: 'bytes32' }],
    name: 'addRecord',
    outputs: [],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'doctorAddress', type: 'address' },
    ],
    name: 'grantAccess',
    outputs: [],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'getRecords',
    outputs: [{ name: '', type: 'bytes32[]' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'recordHash', type: 'bytes32' }],
    name: 'verifyRecord',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
];

export const MOCK_MEDICAL_RECORDS: MedicalRecord[] = [
  {
    id: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p',
    ipfsCID: 'QmXxxx1111111111111111111111111111111111',
    hash: '7c3e7f5e5f3c5e7f5e5f3c5e7f5e5f3c5e7f5e5f3c5e7f5e5f3c5e7f5e5f3c',
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    status: 'active' as const,
    patientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f6bEb1',
    filename: 'chest-xray-2024.pdf',
    description: 'Chest X-Ray examination report',
  },
  {
    id: '0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q',
    ipfsCID: 'QmYyyy2222222222222222222222222222222222',
    hash: '8d4f7e6e5e4d5f7e6e5e4d5f7e6e5e4d5f7e6e5e4d5f7e6e5e4d5f7e6e5e4d',
    timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000,
    status: 'active' as const,
    patientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f6bEb1',
    filename: 'blood-test-results.pdf',
    description: 'Complete blood count (CBC) results',
  },
  {
    id: '0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r',
    ipfsCID: 'QmZzzz3333333333333333333333333333333333',
    hash: '9e5e6f7e7e6f5e7e6f7e7e6f5e7e6f7e7e6f5e7e6f5e7e6f7e7e6f5e7e6f7e',
    timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
    status: 'active' as const,
    patientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f6bEb1',
    filename: 'vaccination-certificate.pdf',
    description: 'COVID-19 vaccination certificate',
  },
];

// Doctor wallet uses the same address as patient (0x742d35Cc6634C0532925a3b844Bc9e7595f6bEb1)
const SAME_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f6bEb1';

export const MOCK_ACCESS_LOGS: AccessLog[] = [
  {
    id: '1',
    recordId: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p',
    accessedBy: SAME_WALLET_ADDRESS,
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    action: 'view',
    doctorName: 'Dr. Sarah Johnson',
  },
  {
    id: '2',
    recordId: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p',
    accessedBy: SAME_WALLET_ADDRESS,
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
    action: 'grant',
  },
  {
    id: '3',
    recordId: '0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q',
    accessedBy: SAME_WALLET_ADDRESS,
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
    action: 'view',
    doctorName: 'Dr. Michael Chen',
  },
  {
    id: '4',
    recordId: '0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q',
    accessedBy: SAME_WALLET_ADDRESS,
    timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000,
    action: 'grant',
  },
];

/**
 * Simulate generating an IPFS CID
 */
export function generateMockIPFSCID(): string {
  const chars = 'QmABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'Qm';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a mock record ID
 */
export function generateMockRecordId(): string {
  return '0x' + Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}
