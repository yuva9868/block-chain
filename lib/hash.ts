/**
 * Generate SHA-256 hash of a file using Web Crypto API
 * This is a browser-native API with no external dependencies
 */
export async function generateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generate hash from a string
 */
export async function generateStringHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Format hash for display (first 16 chars + ... + last 16 chars)
 */
export function formatHash(hash: string): string {
  if (!hash) return '';
  if (hash.length <= 32) return hash;
  return `${hash.slice(0, 16)}...${hash.slice(-16)}`;
}

/**
 * Format hash in a more readable way with separators
 */
export function formatHashReadable(hash: string): string {
  if (!hash) return '';
  // Format as: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
  const chunks = hash.match(/.{1,4}/g) || [];
  return chunks.join('-');
}

/**
 * Get full hash for display (with copy button)
 */
export function getFullHash(hash: string): string {
  if (!hash) return '';
  return hash;
}
