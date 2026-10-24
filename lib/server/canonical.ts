import { createHash } from 'crypto';

export interface CanonicalMedicalRecord {
  recordId: string;
  patientId: string;
  doctorId: string;
  recordType: string;
  diagnosis: string;
  treatment: string;
  version: number;
  timestamp: string; // ISO 8601 UTC
}

/**
 * Normalizes and produces a strictly canonical, deterministic representation of a medical record.
 * Consistent field ordering, whitespace trimming, lowercase keys, and ISO-8601 timestamp format
 * ensure that independent verifiers compute the exact same cryptographic digest.
 */
export function canonicalizeRecord(record: {
  recordId: string;
  patientId: string;
  doctorId?: string;
  recordType: string;
  diagnosis: string;
  treatment: string;
  version?: number;
  timestamp: string | number;
}): { canonicalString: string; normalized: CanonicalMedicalRecord } {
  // Normalize timestamp to ISO string
  const isoTimestamp =
    typeof record.timestamp === 'number'
      ? new Date(record.timestamp).toISOString()
      : new Date(record.timestamp).toISOString();

  const normalized: CanonicalMedicalRecord = {
    recordId: String(record.recordId || '').trim().toLowerCase(),
    patientId: String(record.patientId || '').trim().toLowerCase(),
    doctorId: String(record.doctorId || 'doc-unassigned').trim().toLowerCase(),
    recordType: String(record.recordType || 'clinical_note').trim(),
    diagnosis: String(record.diagnosis || '').trim(),
    treatment: String(record.treatment || '').trim(),
    version: Number(record.version) || 1,
    timestamp: isoTimestamp,
  };

  // Canonical ordering of keys for predictable JSON serialization
  const canonicalObj = {
    recordId: normalized.recordId,
    patientId: normalized.patientId,
    doctorId: normalized.doctorId,
    recordType: normalized.recordType,
    diagnosis: normalized.diagnosis,
    treatment: normalized.treatment,
    version: normalized.version,
    timestamp: normalized.timestamp,
  };

  const canonicalString = JSON.stringify(canonicalObj);
  return { canonicalString, normalized };
}

/**
 * Computes the SHA-256 digest of a canonical medical record string.
 * Returns lowercase 64-hex string.
 */
export function hashCanonicalRecord(canonicalString: string): string {
  return createHash('sha256').update(canonicalString, 'utf8').digest('hex').toLowerCase();
}

/**
 * Helper to canonicalize and hash in a single call.
 */
export function hashRecordData(record: {
  recordId: string;
  patientId: string;
  doctorId?: string;
  recordType: string;
  diagnosis: string;
  treatment: string;
  version?: number;
  timestamp: string | number;
}): { hash: string; canonicalString: string; normalized: CanonicalMedicalRecord } {
  const { canonicalString, normalized } = canonicalizeRecord(record);
  const hash = hashCanonicalRecord(canonicalString);
  return { hash, canonicalString, normalized };
}
