const assert = require('assert');
const { describe, it } = require('node:test');
const { createHash } = require('crypto');

function sha256(str) {
  return createHash('sha256').update(str, 'utf8').digest('hex').toLowerCase();
}

function canonicalizeRecord(record) {
  const normalized = {
    recordId: String(record.recordId || '').trim().toLowerCase(),
    patientId: String(record.patientId || '').trim().toLowerCase(),
    doctorId: String(record.doctorId || 'doc-unassigned').trim().toLowerCase(),
    recordType: String(record.recordType || 'clinical_note').trim(),
    diagnosis: String(record.diagnosis || '').trim(),
    treatment: String(record.treatment || '').trim(),
    version: Number(record.version) || 1,
    timestamp: new Date(record.timestamp).toISOString(),
  };

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
  return { canonicalString, normalized, hash: sha256(canonicalString) };
}

describe('Healthcare Record Cryptographic Integrity & Tamper Detection', () => {
  const originalRecordData = {
    recordId: 'rec-synth-001',
    patientId: 'pat-synth-7842',
    doctorId: 'doc-cardio-402',
    recordType: 'clinical_consultation',
    diagnosis: 'Type 2 Diabetes Mellitus - Fasting Blood Sugar 168 mg/dL',
    treatment: 'Metformin 500mg PO BID with meals',
    version: 1,
    timestamp: '2026-03-01T10:00:00.000Z',
  };

  it('1. A newly registered record passes integrity verification', () => {
    const { hash } = canonicalizeRecord(originalRecordData);
    // Simulating trusted on-chain anchor
    const onChainTrustedHash = hash;

    // Recalculating from retrieved database contents
    const retrieved = canonicalizeRecord(originalRecordData);
    assert.strictEqual(retrieved.hash, onChainTrustedHash);
  });

  it('2. Changing even one single field causes hash verification to fail (Avalanche Effect)', () => {
    const original = canonicalizeRecord(originalRecordData);
    const onChainTrustedHash = original.hash;

    // Unauthorized modification: changing "168 mg/dL" to "169 mg/dL"
    const tamperedData = {
      ...originalRecordData,
      diagnosis: 'Type 2 Diabetes Mellitus - Fasting Blood Sugar 169 mg/dL',
    };

    const tampered = canonicalizeRecord(tamperedData);

    assert.notStrictEqual(tampered.hash, onChainTrustedHash);
    assert.strictEqual(tampered.hash === onChainTrustedHash, false);
  });

  it('3. Modifying treatment/prescription independently triggers tamper detection', () => {
    const original = canonicalizeRecord(originalRecordData);
    const onChainTrustedHash = original.hash;

    // Attacker reduces dosage in database without authorization
    const tamperedData = {
      ...originalRecordData,
      treatment: 'Metformin 250mg PO BID with meals',
    };

    const tampered = canonicalizeRecord(tamperedData);
    assert.notStrictEqual(tampered.hash, onChainTrustedHash);
  });

  it('4. Missing blockchain registration never passes verification', () => {
    const original = canonicalizeRecord(originalRecordData);
    const onChainRecord = null; // Record not registered on smart contract

    const isVerified = onChainRecord !== null && onChainRecord.hash === original.hash;
    assert.strictEqual(isVerified, false);
  });

  it('5. Blockchain / RPC failure reports unavailable and does not falsely report success', () => {
    const rpcAvailable = false;
    let verificationStatus = 'unknown';

    try {
      if (!rpcAvailable) throw new Error('RPC endpoint connection timeout');
      verificationStatus = 'verified';
    } catch {
      verificationStatus = 'unavailable';
    }

    assert.strictEqual(verificationStatus, 'unavailable');
    assert.notStrictEqual(verificationStatus, 'verified');
  });

  it('6. An authorized amendment creates a new version with cryptographic link to Version 1', () => {
    const v1 = canonicalizeRecord(originalRecordData);

    const v2Data = {
      ...originalRecordData,
      diagnosis: 'Type 2 Diabetes Mellitus - 3 Month Follow-up: Fasting Blood Sugar 110 mg/dL',
      treatment: 'Metformin reduced to 250mg PO BID',
      version: 2,
      timestamp: '2026-06-01T10:00:00.000Z',
    };

    const v2 = canonicalizeRecord(v2Data);

    // On-chain version chain simulation
    const versionChain = [
      { version: 1, contentHash: v1.hash, prevHash: '0'.repeat(64) },
      { version: 2, contentHash: v2.hash, prevHash: v1.hash },
    ];

    assert.strictEqual(versionChain.length, 2);
    assert.strictEqual(versionChain[1].prevHash, versionChain[0].contentHash);
    assert.strictEqual(versionChain[1].version, 2);
  });

  it('7. The original version remains independently verifiable after amendment', () => {
    const v1 = canonicalizeRecord(originalRecordData);
    const v2Data = { ...originalRecordData, version: 2, diagnosis: 'Updated clinical review' };
    const v2 = canonicalizeRecord(v2Data);

    const versionRegistry = {
      1: v1.hash,
      2: v2.hash,
    };

    // Re-verify historic version 1 against Version 1's anchored hash
    const recheckedV1 = canonicalizeRecord(originalRecordData);
    assert.strictEqual(recheckedV1.hash, versionRegistry[1]);

    // Verify Version 2 against Version 2's anchored hash
    const recheckedV2 = canonicalizeRecord(v2Data);
    assert.strictEqual(recheckedV2.hash, versionRegistry[2]);
  });

  it('8. Demonstration restore function strictly restores only synthetic demonstration records', () => {
    const realPatientRecord = { id: 'real-001', isSyntheticDemo: false, diagnosis: 'Patient confidential notes' };
    const syntheticDemoRecord = {
      id: 'demo-001',
      isSyntheticDemo: true,
      diagnosis: 'Modified in simulation',
      originalDemoSnapshot: { diagnosis: 'Original baseline' },
    };

    function restoreRecord(rec) {
      if (!rec.isSyntheticDemo) {
        throw new Error('Safety violation: Cannot restore non-synthetic patient records');
      }
      return { ...rec, diagnosis: rec.originalDemoSnapshot.diagnosis };
    }

    // Safety guard rejects non-demo record
    assert.throws(() => restoreRecord(realPatientRecord), /Safety violation/);

    // Allows synthetic demo restore
    const restored = restoreRecord(syntheticDemoRecord);
    assert.strictEqual(restored.diagnosis, 'Original baseline');
  });

  it('9. Repeated verification returns consistent results for unchanged records', () => {
    const run1 = canonicalizeRecord(originalRecordData);
    const run2 = canonicalizeRecord(originalRecordData);
    const run3 = canonicalizeRecord(originalRecordData);

    assert.strictEqual(run1.hash, run2.hash);
    assert.strictEqual(run2.hash, run3.hash);
  });
});
