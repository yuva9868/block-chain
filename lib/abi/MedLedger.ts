export const MED_LEDGER_ABI = [
  {
    type: 'function',
    name: 'registerRecord',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'contentHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'amendRecord',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'newContentHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'grantAccess',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'grantee', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeAccess',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'grantee', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'recordExists',
    stateMutability: 'view',
    inputs: [{ name: 'recordId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getRecord',
    stateMutability: 'view',
    inputs: [{ name: 'recordId', type: 'bytes32' }],
    outputs: [
      { name: 'contentHash', type: 'bytes32' },
      { name: 'owner', type: 'address' },
      { name: 'registeredAt', type: 'uint64' },
      { name: 'exists', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'getVersionCount',
    stateMutability: 'view',
    inputs: [{ name: 'recordId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getVersion',
    stateMutability: 'view',
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'versionNumber', type: 'uint256' },
    ],
    outputs: [
      { name: 'contentHash', type: 'bytes32' },
      { name: 'actor', type: 'address' },
      { name: 'timestamp', type: 'uint64' },
      { name: 'prevHash', type: 'bytes32' },
    ],
  },
  {
    type: 'function',
    name: 'verifyVersionIntegrity',
    stateMutability: 'view',
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'versionNumber', type: 'uint256' },
      { name: 'contentHash', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'verifyIntegrity',
    stateMutability: 'view',
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'contentHash', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'hasAccess',
    stateMutability: 'view',
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getRecordsByOwner',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
  },
  {
    type: 'event',
    name: 'RecordRegistered',
    inputs: [
      { name: 'recordId', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'contentHash', type: 'bytes32', indexed: false },
      { name: 'registeredAt', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'RecordAmended',
    inputs: [
      { name: 'recordId', type: 'bytes32', indexed: true },
      { name: 'actor', type: 'address', indexed: true },
      { name: 'version', type: 'uint256', indexed: false },
      { name: 'newContentHash', type: 'bytes32', indexed: false },
      { name: 'prevContentHash', type: 'bytes32', indexed: false },
      { name: 'timestamp', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AccessGranted',
    inputs: [
      { name: 'recordId', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'grantee', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'AccessRevoked',
    inputs: [
      { name: 'recordId', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'grantee', type: 'address', indexed: true },
    ],
  },
] as const;
