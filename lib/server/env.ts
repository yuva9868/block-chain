import { PUBLIC_CONTRACT_ADDRESS, PUBLIC_RPC_URL } from '@/lib/config';

export function rpcUrl() {
  return (process.env.RPC_URL || PUBLIC_RPC_URL).trim();
}

export function contractAddress() {
  const addr = (process.env.CONTRACT_ADDRESS || PUBLIC_CONTRACT_ADDRESS).trim();
  return addr;
}

export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is missing or too short. Run npm run setup:local.');
  }
  return secret;
}

export function encryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes as 64 hex characters. Run npm run setup:local.');
  }
  return Buffer.from(key, 'hex');
}

export function demoDoctorAddresses() {
  return (process.env.DEMO_DOCTOR_ADDRESSES || '')
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter((a) => /^0x[a-f0-9]{40}$/.test(a));
}
