import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { verifyMessage } from 'ethers';
import { demoDoctorAddresses, sessionSecret } from './env';
import { mutateDb, type UserRole } from './store';

const COOKIE = 'medledger_session';
const nonces = new Map<string, { nonce: string; exp: number }>();

export type Session = {
  address: string;
  role: UserRole;
  exp: number;
};

export function createNonce(address: string) {
  const nonce = randomBytes(16).toString('hex');
  nonces.set(address.toLowerCase(), { nonce, exp: Date.now() + 10 * 60 * 1000 });
  return nonce;
}

export function takeNonce(address: string, nonce: string) {
  const entry = nonces.get(address.toLowerCase());
  if (!entry || entry.nonce !== nonce || entry.exp < Date.now()) return false;
  nonces.delete(address.toLowerCase());
  return true;
}

export function loginMessage(address: string, role: UserRole, nonce: string, issuedAt: string) {
  return [
    'MedLedger authentication',
    `Address: ${address}`,
    `Role: ${role}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    'This signature proves control of the wallet. It is not proof of a medical license.',
  ].join('\n');
}

function signPayload(payload: string) {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function encodeSession(session: Session) {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  return `${payload}.${signPayload(payload)}`;
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = signPayload(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session;
    if (!session.address || !session.role || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

export async function setSessionCookie(session: Session) {
  const jar = await cookies();
  jar.set(COOKIE, encodeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(session.exp),
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export function recoverAddress(message: string, signature: string) {
  return verifyMessage(message, signature);
}

export async function upsertUser(address: string, role: UserRole) {
  const normalized = address.toLowerCase();
  const doctors = demoDoctorAddresses();
  if (role === 'doctor' && doctors.length > 0 && !doctors.includes(normalized)) {
    throw new Error('This wallet is not on the demo doctor allowlist.');
  }
  return mutateDb((db) => {
    const existing = db.users.find((u) => u.address === normalized);
    if (existing) {
      if (existing.role !== role) {
        throw new Error('This wallet already registered as a different role.');
      }
      return existing;
    }
    const user = { address: normalized, role, createdAt: Date.now() };
    db.users.push(user);
    return user;
  });
}

export function assertRole(session: Session | null, roles: UserRole[]) {
  if (!session) {
    const err = new Error('Not authenticated');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  if (!roles.includes(session.role)) {
    const err = new Error('Forbidden for this role');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return session;
}

export function jsonError(error: unknown, fallback = 500) {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : fallback;
  return { status: Number.isFinite(status) && status >= 400 ? status : fallback, message };
}
