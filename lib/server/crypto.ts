import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { encryptionKey } from './env';

export function sha256Buffer(data: Buffer) {
  return createHash('sha256').update(data).digest('hex');
}

export function sha256String(data: string) {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export function randomId() {
  return '0x' + randomBytes(32).toString('hex');
}

export function encryptBuffer(plaintext: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]);
}

export function decryptBuffer(payload: Buffer) {
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function toBytes32Hex(hex: string) {
  const clean = hex.replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error('Value is not a 32-byte hex string');
  }
  return ('0x' + clean) as `0x${string}`;
}
