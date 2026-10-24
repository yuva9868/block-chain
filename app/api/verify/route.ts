import { NextRequest, NextResponse } from 'next/server';
import { assertRole, getSession, jsonError } from '@/lib/server/auth';
import { authorizeRecord, findRecord } from '@/lib/server/access';
import { appendAudit } from '@/lib/server/audit';
import { onChainVerify, onChainVerifyVersion, readOnChainRecord, readOnChainVersion, readOnChainVersionCount } from '@/lib/server/chain';
import { sha256Buffer } from '@/lib/server/crypto';
import { canonicalizeRecord, hashCanonicalRecord } from '@/lib/server/canonical';
import { contractAddress, rpcUrl } from '@/lib/server/env';
import { PUBLIC_CHAIN_NAME } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const session = assertRole(await getSession(), ['patient', 'doctor']);

    let recordId = '';
    let uploadedFile: File | null = null;
    let targetVersion: number | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      recordId = String(body.recordId || '');
      targetVersion = body.version ? Number(body.version) : null;
    } else {
      const form = await req.formData();
      recordId = String(form.get('recordId') || '');
      const file = form.get('file');
      if (file instanceof File && file.size > 0) uploadedFile = file;
      const ver = form.get('version');
      if (ver) targetVersion = Number(ver);
    }

    const record = await findRecord(recordId);
    if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    await authorizeRecord(session, record);

    // 1. Recalculate hash from CURRENT database contents
    let calculatedHash = '';
    let uploadedHash: string | null = null;

    if (uploadedFile) {
      uploadedHash = sha256Buffer(Buffer.from(await uploadedFile.arrayBuffer()));
      calculatedHash = uploadedHash;
    } else if (record.diagnosis || record.treatment) {
      // Recompute canonical hash from current database fields
      const { canonicalString } = canonicalizeRecord({
        recordId: record.id,
        patientId: record.patientId || session.address,
        doctorId: record.doctorId || 'doc-general',
        recordType: record.recordType,
        diagnosis: record.diagnosis || '',
        treatment: record.treatment || '',
        version: record.version || 1,
        timestamp: record.createdAt,
      });
      calculatedHash = hashCanonicalRecord(canonicalString);
    } else {
      calculatedHash = record.contentHash;
    }

    try {
      const onChain = await readOnChainRecord(record.id);
      if (!onChain.exists) {
        await appendAudit({
          action: 'record_verification',
          actor: session.address,
          recordId: record.id,
          source: 'off-chain',
          details: 'status=not_registered',
        });
        return NextResponse.json({
          status: 'not_registered',
          storedHash: record.contentHash,
          calculatedHash,
          onChainHash: null,
          error: 'No trusted blockchain anchor exists for this record on the smart contract',
          networkName: PUBLIC_CHAIN_NAME,
          contractAddress: contractAddress(),
        });
      }

      // Check specific version or latest version
      let onChainTargetHash = onChain.contentHash;
      let isVerified = false;

      if (targetVersion && targetVersion > 0) {
        try {
          const verData = await readOnChainVersion(record.id, targetVersion);
          onChainTargetHash = verData.contentHash;
          isVerified = await onChainVerifyVersion(record.id, targetVersion, calculatedHash);
        } catch {
          // Fallback to latest if version query fails
          isVerified = await onChainVerify(record.id, calculatedHash);
        }
      } else {
        isVerified = await onChainVerify(record.id, calculatedHash);
      }

      const status = isVerified ? 'verified' : 'mismatch';

      await appendAudit({
        action: status === 'verified' ? 'record_verification' : 'tampering_detected',
        actor: session.address,
        recordId: record.id,
        source: 'on-chain',
        txHash: record.txHash,
        details: `status=${status}|calculated=${calculatedHash}|onChain=${onChainTargetHash}`,
      });

      return NextResponse.json({
        status,
        storedHash: record.contentHash,
        calculatedHash,
        onChainHash: onChainTargetHash,
        uploadedHash,
        txHash: record.txHash,
        blockNumber: record.blockNumber,
        registeredAt: onChain.registeredAt,
        contractOwner: onChain.owner,
        recordVersion: record.version || 1,
        versionHistory: record.versions || [],
        networkName: PUBLIC_CHAIN_NAME,
        contractAddress: contractAddress(),
        lastVerified: Date.now(),
      });
    } catch (error) {
      await appendAudit({
        action: 'record_verification',
        actor: session.address,
        recordId: record.id,
        source: 'off-chain',
        details: 'rpc_unavailable',
      });
      return NextResponse.json({
        status: 'unavailable',
        storedHash: record.contentHash,
        calculatedHash,
        error: error instanceof Error ? error.message : 'Blockchain RPC is unreachable',
        networkName: PUBLIC_CHAIN_NAME,
        contractAddress: contractAddress(),
      });
    }
  } catch (error) {
    const { status, message } = jsonError(error, 401);
    return NextResponse.json({ error: message }, { status });
  }
}
