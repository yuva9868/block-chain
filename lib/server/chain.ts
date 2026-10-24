import { Contract, EventLog, Interface, JsonRpcProvider } from 'ethers';
import { MED_LEDGER_ABI } from '@/lib/abi/MedLedger';
import { contractAddress, rpcUrl } from './env';
import { toBytes32Hex } from './crypto';
import {
  isRpcAvailable,
  memGetRecord,
  memGetVersion,
  memGetVersionCount,
  memHasAccess,
  memListEvents,
  memVerifyIntegrity,
  memVerifyVersionIntegrity,
} from './in-memory-chain';

// ─── RPC Connectivity Check ──────────────────────────────────────

async function useOnChain(): Promise<boolean> {
  try {
    const addr = contractAddress();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) return false;
    return await isRpcAvailable(rpcUrl());
  } catch {
    return false;
  }
}

// ─── Ethers Provider/Contract (real chain) ───────────────────────

export function getProvider() {
  const url = rpcUrl();
  if (!url) throw Object.assign(new Error('RPC_URL is not configured'), { status: 503 });
  return new JsonRpcProvider(url);
}

export function getReadContract() {
  const address = contractAddress();
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw Object.assign(new Error('Contract address is not configured'), { status: 503 });
  }
  return new Contract(address, MED_LEDGER_ABI, getProvider());
}

// ─── Hybrid Read Functions (real chain → fallback to in-memory) ──

export async function readOnChainRecord(recordId: string) {
  if (await useOnChain()) {
    const contract = getReadContract();
    const rec = await contract.getRecord(toBytes32Hex(recordId));
    return {
      contentHash: String(rec.contentHash).toLowerCase(),
      owner: String(rec.owner).toLowerCase(),
      registeredAt: Number(rec.registeredAt),
      exists: Boolean(rec.exists),
    };
  }
  // In-memory fallback
  const rec = memGetRecord(recordId);
  return {
    contentHash: rec.contentHash.toLowerCase(),
    owner: rec.owner.toLowerCase(),
    registeredAt: rec.registeredAt,
    exists: rec.exists,
  };
}

export async function onChainHasAccess(recordId: string, account: string) {
  if (await useOnChain()) {
    const contract = getReadContract();
    return Boolean(await contract.hasAccess(toBytes32Hex(recordId), account));
  }
  return memHasAccess(recordId, account);
}

export async function onChainVerify(recordId: string, contentHash: string) {
  if (await useOnChain()) {
    const contract = getReadContract();
    return Boolean(await contract.verifyIntegrity(toBytes32Hex(recordId), toBytes32Hex(contentHash)));
  }
  try {
    return memVerifyIntegrity(recordId, contentHash);
  } catch {
    return false;
  }
}

export async function readOnChainVersionCount(recordId: string): Promise<number> {
  if (await useOnChain()) {
    const contract = getReadContract();
    const count = await contract.getVersionCount(toBytes32Hex(recordId));
    return Number(count);
  }
  return memGetVersionCount(recordId);
}

export async function readOnChainVersion(recordId: string, versionNumber: number) {
  if (await useOnChain()) {
    const contract = getReadContract();
    const ver = await contract.getVersion(toBytes32Hex(recordId), versionNumber);
    return {
      contentHash: String(ver.contentHash).toLowerCase(),
      actor: String(ver.actor).toLowerCase(),
      timestamp: Number(ver.timestamp),
      prevHash: String(ver.prevHash).toLowerCase(),
    };
  }
  const ver = memGetVersion(recordId, versionNumber);
  return {
    contentHash: ver.contentHash.toLowerCase(),
    actor: ver.actor.toLowerCase(),
    timestamp: ver.timestamp,
    prevHash: ver.prevHash.toLowerCase(),
  };
}

export async function onChainVerifyVersion(recordId: string, versionNumber: number, contentHash: string): Promise<boolean> {
  if (await useOnChain()) {
    const contract = getReadContract();
    return Boolean(
      await contract.verifyVersionIntegrity(
        toBytes32Hex(recordId),
        versionNumber,
        toBytes32Hex(contentHash)
      )
    );
  }
  try {
    return memVerifyVersionIntegrity(recordId, versionNumber, contentHash);
  } catch {
    return false;
  }
}

export async function confirmRegistrationTx(txHash: string, recordId: string, owner: string) {
  if (!(await useOnChain())) {
    // In-memory mode: skip tx confirmation, trust the relay result
    return { blockNumber: 0, txHash };
  }
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw Object.assign(new Error('Transaction is not confirmed on the configured network'), { status: 400 });
  }
  const tx = await provider.getTransaction(txHash);
  if (!tx || tx.from.toLowerCase() !== owner.toLowerCase()) {
    throw Object.assign(new Error('Transaction sender does not match the authenticated wallet'), { status: 400 });
  }
  const iface = new Interface(MED_LEDGER_ABI);
  const expectedId = toBytes32Hex(recordId).toLowerCase();
  const match = receipt.logs.some((log) => {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      return parsed?.name === 'RecordRegistered' && String(parsed.args.recordId).toLowerCase() === expectedId;
    } catch {
      return false;
    }
  });
  if (!match) {
    throw Object.assign(new Error('Transaction does not contain a RecordRegistered event for this record'), { status: 400 });
  }
  return { blockNumber: receipt.blockNumber, txHash: receipt.hash };
}

export async function confirmAmendmentTx(txHash: string, recordId: string, actor: string) {
  if (!(await useOnChain())) {
    return { blockNumber: 0, txHash, version: 1, newHash: '', prevHash: '' };
  }
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw Object.assign(new Error('Amendment transaction is not confirmed on the configured network'), { status: 400 });
  }
  const tx = await provider.getTransaction(txHash);
  if (!tx || tx.from.toLowerCase() !== actor.toLowerCase()) {
    throw Object.assign(new Error('Transaction sender does not match the authorized actor'), { status: 400 });
  }
  const iface = new Interface(MED_LEDGER_ABI);
  const expectedId = toBytes32Hex(recordId).toLowerCase();
  let amendedVersion = 1;
  let newHash = '';
  let prevHash = '';
  const match = receipt.logs.some((log) => {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === 'RecordAmended' && String(parsed.args.recordId).toLowerCase() === expectedId) {
        amendedVersion = Number(parsed.args.version);
        newHash = String(parsed.args.newContentHash).toLowerCase();
        prevHash = String(parsed.args.prevContentHash).toLowerCase();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });
  if (!match) {
    throw Object.assign(new Error('Transaction does not contain a RecordAmended event for this record'), { status: 400 });
  }
  return { blockNumber: receipt.blockNumber, txHash: receipt.hash, version: amendedVersion, newHash, prevHash };
}

export async function confirmAccessTx(
  txHash: string,
  recordId: string,
  owner: string,
  grantee: string,
  eventName: 'AccessGranted' | 'AccessRevoked'
) {
  if (!(await useOnChain())) {
    return { blockNumber: 0, txHash };
  }
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw Object.assign(new Error('Transaction is not confirmed on the configured network'), { status: 400 });
  }
  const tx = await provider.getTransaction(txHash);
  if (!tx || tx.from.toLowerCase() !== owner.toLowerCase()) {
    throw Object.assign(new Error('Transaction sender does not match the record owner'), { status: 400 });
  }
  const iface = new Interface(MED_LEDGER_ABI);
  const expectedId = toBytes32Hex(recordId).toLowerCase();
  const expectedGrantee = grantee.toLowerCase();
  const match = receipt.logs.some((log) => {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      return (
        parsed?.name === eventName &&
        String(parsed.args.recordId).toLowerCase() === expectedId &&
        String(parsed.args.grantee).toLowerCase() === expectedGrantee
      );
    } catch {
      return false;
    }
  });
  if (!match) {
    throw Object.assign(new Error(`Transaction does not contain a ${eventName} event for this grant`), { status: 400 });
  }
  return { blockNumber: receipt.blockNumber, txHash: receipt.hash };
}

export async function listChainEvents(fromBlock = 0) {
  if (await useOnChain()) {
    const contract = getReadContract();
    const provider = getProvider();
    const latest = await provider.getBlockNumber();
    const registered = (await contract.queryFilter(contract.filters.RecordRegistered(), fromBlock, latest)) as EventLog[];
    const amended = (await contract.queryFilter(contract.filters.RecordAmended(), fromBlock, latest)) as EventLog[];
    const granted = (await contract.queryFilter(contract.filters.AccessGranted(), fromBlock, latest)) as EventLog[];
    const revoked = (await contract.queryFilter(contract.filters.AccessRevoked(), fromBlock, latest)) as EventLog[];
    const mapped = [...registered, ...amended, ...granted, ...revoked].map((ev) => ({
      event: ev.eventName,
      txHash: ev.transactionHash,
      blockNumber: ev.blockNumber,
      recordId: String(ev.args?.[0] ?? ev.args?.recordId ?? ''),
      owner: String(ev.args?.owner ?? ev.args?.actor ?? ''),
      grantee: ev.args?.grantee ? String(ev.args.grantee) : undefined,
      contentHash: ev.args?.contentHash
        ? String(ev.args.contentHash)
        : ev.args?.newContentHash
          ? String(ev.args.newContentHash)
          : undefined,
      registeredAt: ev.args?.registeredAt
        ? Number(ev.args.registeredAt)
        : ev.args?.timestamp
          ? Number(ev.args.timestamp)
          : undefined,
      version: ev.args?.version ? Number(ev.args.version) : undefined,
      prevContentHash: ev.args?.prevContentHash ? String(ev.args.prevContentHash) : undefined,
    }));
    mapped.sort((a, b) => a.blockNumber - b.blockNumber);
    return { latest, events: mapped };
  }
  return memListEvents(fromBlock);
}
