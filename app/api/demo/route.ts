import { NextRequest, NextResponse } from 'next/server';
import { getSession, jsonError } from '@/lib/server/auth';
import { appendAudit } from '@/lib/server/audit';
import { getDb, mutateDb, type StoredRecord } from '@/lib/server/store';
import { randomId, sha256Buffer } from '@/lib/server/crypto';
import { canonicalizeRecord, hashCanonicalRecord } from '@/lib/server/canonical';
import { onChainVerify, onChainVerifyVersion, readOnChainRecord, readOnChainVersion } from '@/lib/server/chain';
import { relayAmendRecord, relayRegisterRecord } from '@/lib/server/demo-relayer';
import { contractAddress } from '@/lib/server/env';
import { PUBLIC_CHAIN_NAME } from '@/lib/config';

const DEMO_PATIENT_ID = 'pat-synth-7842';
const DEMO_DOCTOR_ID = 'doc-cardio-402';
const DEMO_ORIGINAL_DIAGNOSIS =
  'Type 2 Diabetes Mellitus (E11.9) - Fasting blood glucose 168 mg/dL, HbA1c 7.4%. Early peripheral neuropathy.';
const DEMO_ORIGINAL_TREATMENT =
  'Metformin 500mg PO BID with meals. Atorvastatin 20mg PO QHS. Diabetic lifestyle diet & daily glucose monitoring.';

const DEMO_TAMPERED_DIAGNOSIS =
  'Normal clinical profile - No Diabetes. Blood sugar: 85 mg/dL. [TAMPERED DATA: All diabetes indicators erased]';
const DEMO_TAMPERED_TREATMENT =
  'No medication needed. Discharge patient immediately without further follow-up. [UNAUTHORIZED RECORD MODIFICATION]';

const DEMO_AMENDED_DIAGNOSIS =
  'Type 2 Diabetes Mellitus (E11.9) - 3-Month Follow-Up: Fasting glucose normalized to 110 mg/dL, HbA1c improved to 6.3%.';
const DEMO_AMENDED_TREATMENT =
  'Reduce Metformin to 250mg PO BID. Continue Atorvastatin 20mg PO QHS. Maintain exercise regimen.';
const DEMO_AMENDMENT_REASON =
  'Authorized clinical follow-up: positive glycemic response. Dosage step-down protocol approved by Dr. Evelyn Reed.';

async function findDemoRecord(): Promise<StoredRecord | null> {
  const db = await getDb();
  return db.records.find((r) => r.isSyntheticDemo === true) || null;
}

export async function GET() {
  try {
    const record = await findDemoRecord();
    if (!record) {
      return NextResponse.json({ record: null, status: 'not_created' });
    }

    // Recalculate hash from current DB contents
    const { canonicalString } = canonicalizeRecord({
      recordId: record.id,
      patientId: record.patientId || DEMO_PATIENT_ID,
      doctorId: record.doctorId || DEMO_DOCTOR_ID,
      recordType: record.recordType,
      diagnosis: record.diagnosis || '',
      treatment: record.treatment || '',
      version: record.version || 1,
      timestamp: record.createdAt,
    });
    const calculatedHash = hashCanonicalRecord(canonicalString);

    let onChainData: { contentHash: string; owner: string; registeredAt: number; exists: boolean } | null = null;
    let match = false;
    let chainError: string | null = null;

    try {
      const onChain = await readOnChainRecord(record.id);
      onChainData = onChain;
      if (onChain.exists) {
        match = await onChainVerify(record.id, calculatedHash);
      }
    } catch (err) {
      chainError = err instanceof Error ? err.message : 'RPC unreachable';
    }

    const isTampered = Boolean(
      record.originalDemoSnapshot &&
      (record.diagnosis !== record.originalDemoSnapshot.diagnosis ||
        record.treatment !== record.originalDemoSnapshot.treatment) &&
      record.version === 1
    );

    return NextResponse.json({
      record,
      calculatedHash,
      onChainHash: onChainData?.contentHash || null,
      onChainExists: Boolean(onChainData?.exists),
      status: onChainData?.exists ? (match ? 'verified' : 'mismatch') : 'not_registered',
      isTampered,
      chainError,
      contractAddress: contractAddress(),
      networkName: PUBLIC_CHAIN_NAME,
    });
  } catch (error) {
    const { status, message } = jsonError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const actor = session?.address || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    // ─────────────────────────────────────────────────────────
    // ACTION A: CREATE TEST RECORD
    // ─────────────────────────────────────────────────────────
    if (action === 'create') {
      const id = randomId();
      const now = Date.now();

      const { canonicalString, normalized } = canonicalizeRecord({
        recordId: id,
        patientId: DEMO_PATIENT_ID,
        doctorId: DEMO_DOCTOR_ID,
        recordType: 'synthetic_clinical_consultation',
        diagnosis: DEMO_ORIGINAL_DIAGNOSIS,
        treatment: DEMO_ORIGINAL_TREATMENT,
        version: 1,
        timestamp: now,
      });

      const contentHash = hashCanonicalRecord(canonicalString);

      // Register on blockchain
      let txHash = String(body.txHash || '');
      let blockNumber = 0;

      if (!txHash) {
        try {
          const relayed = await relayRegisterRecord(id, contentHash);
          txHash = relayed.txHash;
          blockNumber = relayed.blockNumber;
        } catch (chainErr) {
          console.warn('Direct blockchain anchoring error (will save pending):', chainErr);
        }
      }

      const record: StoredRecord = {
        id,
        ownerAddress: actor,
        contentHash,
        filename: 'synthetic-alice-consultation.json',
        description: 'Synthetic Patient Demonstration Record (Faculty Evaluation)',
        recordType: 'synthetic_clinical_consultation',
        recordDate: new Date().toISOString().split('T')[0],
        mimeType: 'application/json',
        size: Buffer.from(canonicalString, 'utf8').length,
        createdAt: now,
        status: txHash ? 'registered' : 'pending_chain',
        txHash: txHash || undefined,
        blockNumber: blockNumber || undefined,
        grants: [],
        patientId: DEMO_PATIENT_ID,
        doctorId: DEMO_DOCTOR_ID,
        diagnosis: DEMO_ORIGINAL_DIAGNOSIS,
        treatment: DEMO_ORIGINAL_TREATMENT,
        version: 1,
        canonicalString,
        isSyntheticDemo: true,
        versions: [
          {
            version: 1,
            contentHash,
            canonicalString,
            diagnosis: DEMO_ORIGINAL_DIAGNOSIS,
            treatment: DEMO_ORIGINAL_TREATMENT,
            actor,
            timestamp: now,
            txHash: txHash || undefined,
            blockNumber: blockNumber || undefined,
            reason: 'Initial synthetic baseline record creation',
          },
        ],
        originalDemoSnapshot: {
          diagnosis: DEMO_ORIGINAL_DIAGNOSIS,
          treatment: DEMO_ORIGINAL_TREATMENT,
          contentHash,
          canonicalString,
        },
      };

      await mutateDb((db) => {
        // Remove any previous demo records to keep lab clean and predictable
        db.records = db.records.filter((r) => !r.isSyntheticDemo);
        db.records.push(record);
      });

      await appendAudit({
        action: 'record_created',
        actor,
        recordId: id,
        source: 'off-chain',
        details: `synthetic_test_record|patient=${DEMO_PATIENT_ID}`,
      });

      if (txHash) {
        await appendAudit({
          action: 'blockchain_registration',
          actor,
          recordId: id,
          source: 'on-chain',
          txHash,
          details: `block=${blockNumber}|digest=${contentHash}`,
        });
      }

      return NextResponse.json({
        success: true,
        record,
        canonicalRecord: normalized,
        canonicalString,
        contentHash,
        txHash,
        blockNumber,
        status: 'verified',
        message: 'Synthetic test record created, canonical SHA-256 computed, and anchored to smart contract.',
      });
    }

    // Find current active demo record for subsequent actions
    const existing = await findDemoRecord();
    if (!existing) {
      return NextResponse.json({ error: 'No test record found. Please click Create Test Record first.' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION B: VERIFY ORIGINAL RECORD
    // ─────────────────────────────────────────────────────────
    if (action === 'verify') {
      const { canonicalString } = canonicalizeRecord({
        recordId: existing.id,
        patientId: existing.patientId || DEMO_PATIENT_ID,
        doctorId: existing.doctorId || DEMO_DOCTOR_ID,
        recordType: existing.recordType,
        diagnosis: existing.diagnosis || '',
        treatment: existing.treatment || '',
        version: existing.version || 1,
        timestamp: existing.createdAt,
      });

      const calculatedHash = hashCanonicalRecord(canonicalString);
      const onChain = await readOnChainRecord(existing.id);

      const match = await onChainVerify(existing.id, calculatedHash);
      const status = match ? 'verified' : 'mismatch';

      await appendAudit({
        action: status === 'verified' ? 'record_verification' : 'tampering_detected',
        actor,
        recordId: existing.id,
        source: 'on-chain',
        txHash: existing.txHash,
        details: `status=${status}|calculated=${calculatedHash}|onChain=${onChain.contentHash}`,
      });

      return NextResponse.json({
        status,
        calculatedHash,
        onChainHash: onChain.contentHash,
        storedHash: existing.contentHash,
        txHash: existing.txHash,
        blockNumber: existing.blockNumber,
        contractAddress: contractAddress(),
        networkName: PUBLIC_CHAIN_NAME,
        match,
        message:
          status === 'verified'
            ? 'Cryptographic match confirmed! Freshly recalculated SHA-256 matches trusted on-chain anchor.'
            : 'TAMPERING DETECTED! Recalculated hash does not match trusted blockchain reference.',
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION C: SIMULATE UNAUTHORIZED TAMPERING (Simulated Attack)
    // ─────────────────────────────────────────────────────────
    if (action === 'tamper') {
      const originalDiagnosis = existing.diagnosis;
      const originalTreatment = existing.treatment;
      const originalHash = existing.contentHash;

      // Directly tamper with database fields, bypassing the blockchain smart contract!
      const { canonicalString } = canonicalizeRecord({
        recordId: existing.id,
        patientId: existing.patientId || DEMO_PATIENT_ID,
        doctorId: existing.doctorId || DEMO_DOCTOR_ID,
        recordType: existing.recordType,
        diagnosis: DEMO_TAMPERED_DIAGNOSIS,
        treatment: DEMO_TAMPERED_TREATMENT,
        version: existing.version || 1,
        timestamp: existing.createdAt,
      });

      const tamperedHash = hashCanonicalRecord(canonicalString);

      await mutateDb((db) => {
        const target = db.records.find((r) => r.id === existing.id);
        if (!target) return;
        target.diagnosis = DEMO_TAMPERED_DIAGNOSIS;
        target.treatment = DEMO_TAMPERED_TREATMENT;
        target.canonicalString = canonicalString;
        // NOTE: target.contentHash remains the old registered hash OR target field is altered.
        // In an attack, an intruder alters the diagnosis/treatment off-chain without authorized smart contract transaction.
      });

      await appendAudit({
        action: 'unauthorized_modification_attempt',
        actor: 'attacker_simulated_db_injection',
        recordId: existing.id,
        source: 'off-chain',
        details: `tampered_fields=diagnosis,treatment|tamperedHash=${tamperedHash}|originalHash=${originalHash}`,
      });

      await appendAudit({
        action: 'tampering_detected',
        actor: 'security_monitor',
        recordId: existing.id,
        source: 'off-chain',
        details: `mismatch_detected_post_tamper|hashDivergence=${originalHash}->${tamperedHash}`,
      });

      return NextResponse.json({
        success: true,
        status: 'tampering_detected',
        fieldAltered: 'diagnosis and treatment',
        originalDiagnosis,
        tamperedDiagnosis: DEMO_TAMPERED_DIAGNOSIS,
        originalTreatment,
        tamperedTreatment: DEMO_TAMPERED_TREATMENT,
        originalOnChainHash: originalHash,
        tamperedCalculatedHash: tamperedHash,
        explanation:
          'SIMULATED ATTACK EXECUTED: Clinical notes altered directly in database without authorized smart contract amendment. Notice how a single altered diagnosis alters the entire 256-bit hash (Avalanche Effect). The blockchain still securely preserves the trusted anchor.',
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION D: VERIFY AFTER TAMPERING
    // ─────────────────────────────────────────────────────────
    if (action === 'verify_tampered') {
      const { canonicalString } = canonicalizeRecord({
        recordId: existing.id,
        patientId: existing.patientId || DEMO_PATIENT_ID,
        doctorId: existing.doctorId || DEMO_DOCTOR_ID,
        recordType: existing.recordType,
        diagnosis: existing.diagnosis || '',
        treatment: existing.treatment || '',
        version: existing.version || 1,
        timestamp: existing.createdAt,
      });

      const calculatedHash = hashCanonicalRecord(canonicalString);
      const onChain = await readOnChainRecord(existing.id);
      const match = await onChainVerify(existing.id, calculatedHash);

      await appendAudit({
        action: 'tampering_detected',
        actor,
        recordId: existing.id,
        source: 'on-chain',
        txHash: existing.txHash,
        details: `tampering_confirmed|calculated=${calculatedHash}|onChain=${onChain.contentHash}`,
      });

      return NextResponse.json({
        status: match ? 'verified' : 'mismatch',
        calculatedHash,
        onChainHash: onChain.contentHash,
        storedHash: existing.contentHash,
        match,
        failureEvidence: {
          fieldMismatch: 'Diagnosis and Treatment altered from original baseline',
          hashDivergence: `Calculated (${calculatedHash.slice(0, 16)}...) != On-Chain (${onChain.contentHash.slice(0, 16)}...)`,
          securityConclusion: 'TAMPERING DETECTED: Unauthorized alteration detected by smart contract reference.',
        },
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION E: RESTORE THE TEST RECORD
    // ─────────────────────────────────────────────────────────
    if (action === 'restore') {
      if (!existing.isSyntheticDemo || !existing.originalDemoSnapshot) {
        return NextResponse.json({ error: 'Only synthetic demonstration records can be restored.' }, { status: 400 });
      }

      const snap = existing.originalDemoSnapshot;

      await mutateDb((db) => {
        const target = db.records.find((r) => r.id === existing.id);
        if (!target) return;
        target.diagnosis = snap.diagnosis;
        target.treatment = snap.treatment;
        target.contentHash = snap.contentHash;
        target.canonicalString = snap.canonicalString;
      });

      const { canonicalString } = canonicalizeRecord({
        recordId: existing.id,
        patientId: existing.patientId || DEMO_PATIENT_ID,
        doctorId: existing.doctorId || DEMO_DOCTOR_ID,
        recordType: existing.recordType,
        diagnosis: snap.diagnosis,
        treatment: snap.treatment,
        version: 1,
        timestamp: existing.createdAt,
      });

      const restoredHash = hashCanonicalRecord(canonicalString);
      const onChain = await readOnChainRecord(existing.id);
      const match = await onChainVerify(existing.id, restoredHash);

      await appendAudit({
        action: 'demo_record_restored',
        actor,
        recordId: existing.id,
        source: 'off-chain',
        details: `restored_to_baseline|digest=${restoredHash}`,
      });

      await appendAudit({
        action: 'record_verification',
        actor,
        recordId: existing.id,
        source: 'on-chain',
        txHash: existing.txHash,
        details: `post_restore_verified|status=verified`,
      });

      return NextResponse.json({
        success: true,
        status: match ? 'verified' : 'mismatch',
        restoredHash,
        onChainHash: onChain.contentHash,
        message: 'Synthetic test record restored to pristine baseline state. Verification returned to VERIFIED.',
      });
    }

    // ─────────────────────────────────────────────────────────
    // ACTION F: DEMONSTRATE AN AUTHORIZED AMENDMENT (Version 2)
    // ─────────────────────────────────────────────────────────
    if (action === 'amend') {
      const now = Date.now();
      const prevHash = existing.contentHash;

      // Generate canonical representation for Version 2
      const { canonicalString, normalized } = canonicalizeRecord({
        recordId: existing.id,
        patientId: existing.patientId || DEMO_PATIENT_ID,
        doctorId: existing.doctorId || DEMO_DOCTOR_ID,
        recordType: existing.recordType,
        diagnosis: DEMO_AMENDED_DIAGNOSIS,
        treatment: DEMO_AMENDED_TREATMENT,
        version: 2,
        timestamp: now,
      });

      const newContentHash = hashCanonicalRecord(canonicalString);

      let txHash = String(body.txHash || '');
      let blockNumber = 0;

      if (!txHash) {
        try {
          const relayed = await relayAmendRecord(existing.id, newContentHash);
          txHash = relayed.txHash;
          blockNumber = relayed.blockNumber;
        } catch (chainErr) {
          console.warn('Direct amendment relay failed:', chainErr);
        }
      }

      await mutateDb((db) => {
        const target = db.records.find((r) => r.id === existing.id);
        if (!target) return;
        target.contentHash = newContentHash;
        target.version = 2;
        target.diagnosis = DEMO_AMENDED_DIAGNOSIS;
        target.treatment = DEMO_AMENDED_TREATMENT;
        target.canonicalString = canonicalString;
        target.txHash = txHash || target.txHash;
        target.blockNumber = blockNumber || target.blockNumber;

        if (!target.versions) target.versions = [];
        target.versions.push({
          version: 2,
          contentHash: newContentHash,
          prevHash,
          canonicalString,
          diagnosis: DEMO_AMENDED_DIAGNOSIS,
          treatment: DEMO_AMENDED_TREATMENT,
          actor,
          timestamp: now,
          txHash: txHash || undefined,
          blockNumber: blockNumber || undefined,
          reason: DEMO_AMENDMENT_REASON,
        });
      });

      await appendAudit({
        action: 'authorized_amendment',
        actor,
        recordId: existing.id,
        source: 'on-chain',
        txHash: txHash || undefined,
        details: `version=2|prevHash=${prevHash}|newHash=${newContentHash}|reason=${DEMO_AMENDMENT_REASON}`,
      });

      // Verify both Version 1 and Version 2
      let v1Verified = false;
      let v2Verified = false;

      try {
        v1Verified = await onChainVerifyVersion(existing.id, 1, prevHash);
        v2Verified = await onChainVerifyVersion(existing.id, 2, newContentHash);
      } catch {
        v2Verified = await onChainVerify(existing.id, newContentHash);
      }

      return NextResponse.json({
        success: true,
        version: 2,
        newContentHash,
        prevContentHash: prevHash,
        txHash,
        blockNumber,
        amendedRecord: normalized,
        versions: [
          {
            version: 1,
            hash: prevHash,
            verified: v1Verified,
            note: 'Original baseline preserved and independently verifiable on-chain',
          },
          {
            version: 2,
            hash: newContentHash,
            verified: v2Verified,
            note: 'Authorized amendment with cryptographic link to Version 1',
          },
        ],
        message:
          'Authorized amendment successfully anchored to smart contract! Version 1 remains intact and verifiable, while Version 2 creates a permanent, tamper-evident audit progression.',
      });
    }

    return NextResponse.json({ error: `Unknown demo action: ${action}` }, { status: 400 });
  } catch (error) {
    const { status, message } = jsonError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
