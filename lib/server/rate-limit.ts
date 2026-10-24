const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function clientKey(headers: Headers) {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || 'local';
}
