import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { MED_LEDGER_ABI } from '@/lib/abi/MedLedger';
import { contractAddress, rpcUrl } from './env';
import { toBytes32Hex } from './crypto';
import {
  isRpcAvailable,
  memAmendRecord,
  memGrantAccess,
  memRegisterRecord,
  memRevokeAccess,
} from './in-memory-chain';

// Standard Hardhat default test account #0 private key
const HARDHAT_DEFAULT_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// Default demo sender for in-memory mode
const FALLBACK_SENDER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

export function getDemoSigner() {
  const url = rpcUrl();
  const provider = new JsonRpcProvider(url);
  const key = process.env.DEPLOYER_PRIVATE_KEY || HARDHAT_DEFAULT_KEY;
  return new Wallet(key, provider);
}

export function getDemoWriteContract() {
  const addr = contractAddress();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error('Contract address is not configured. Deploy contract first.');
  }
  const signer = getDemoSigner();
  return new Contract(addr, MED_LEDGER_ABI, signer);
}

export async function relayRegisterRecord(recordId: string, contentHash: string) {
  // Try real chain first
  const rpc = rpcUrl();
  if (await isRpcAvailable(rpc)) {
    try {
      const contract = getDemoWriteContract();
      const signer = getDemoSigner();
      const signerAddress = await signer.getAddress();
      const tx = await contract.registerRecord(toBytes32Hex(recordId), toBytes32Hex(contentHash));
      const receipt = await tx.wait();
      return {
        txHash: tx.hash as string,
        blockNumber: Number(receipt.blockNumber),
        signerAddress,
        mode: 'on-chain' as const,
      };
    } catch (err) {
      console.warn('[relay] On-chain registerRecord failed, falling back to in-memory:', err);
    }
  }

  // In-memory fallback
  const result = memRegisterRecord(recordId, contentHash, FALLBACK_SENDER);
  return {
    txHash: result.txHash,
    blockNumber: result.blockNumber,
    signerAddress: FALLBACK_SENDER,
    mode: 'in-memory' as const,
  };
}

export async function relayAmendRecord(recordId: string, newContentHash: string) {
  const rpc = rpcUrl();
  if (await isRpcAvailable(rpc)) {
    try {
      const contract = getDemoWriteContract();
      const signer = getDemoSigner();
      const signerAddress = await signer.getAddress();
      const tx = await contract.amendRecord(toBytes32Hex(recordId), toBytes32Hex(newContentHash));
      const receipt = await tx.wait();
      return {
        txHash: tx.hash as string,
        blockNumber: Number(receipt.blockNumber),
        signerAddress,
        mode: 'on-chain' as const,
      };
    } catch (err) {
      console.warn('[relay] On-chain amendRecord failed, falling back to in-memory:', err);
    }
  }

  // In-memory fallback
  const result = memAmendRecord(recordId, newContentHash, FALLBACK_SENDER);
  return {
    txHash: result.txHash,
    blockNumber: result.blockNumber,
    signerAddress: FALLBACK_SENDER,
    mode: 'in-memory' as const,
  };
}

export async function relayGrantAccess(recordId: string, doctor: string, ownerAddress: string) {
  const rpc = rpcUrl();
  if (await isRpcAvailable(rpc)) {
    try {
      const contract = getDemoWriteContract();
      const tx = await contract.grantAccess(toBytes32Hex(recordId), doctor);
      const receipt = await tx.wait();
      return {
        txHash: tx.hash as string,
        blockNumber: Number(receipt.blockNumber),
        mode: 'on-chain' as const,
      };
    } catch (err) {
      console.warn('[relay] On-chain grantAccess failed, falling back to in-memory:', err);
    }
  }

  const result = memGrantAccess(recordId, doctor, ownerAddress || FALLBACK_SENDER);
  return {
    txHash: result.txHash,
    blockNumber: result.blockNumber,
    mode: 'in-memory' as const,
  };
}

export async function relayRevokeAccess(recordId: string, doctor: string, ownerAddress: string) {
  const rpc = rpcUrl();
  if (await isRpcAvailable(rpc)) {
    try {
      const contract = getDemoWriteContract();
      const tx = await contract.revokeAccess(toBytes32Hex(recordId), doctor);
      const receipt = await tx.wait();
      return {
        txHash: tx.hash as string,
        blockNumber: Number(receipt.blockNumber),
        mode: 'on-chain' as const,
      };
    } catch (err) {
      console.warn('[relay] On-chain revokeAccess failed, falling back to in-memory:', err);
    }
  }

  const result = memRevokeAccess(recordId, doctor, ownerAddress || FALLBACK_SENDER);
  return {
    txHash: result.txHash,
    blockNumber: result.blockNumber,
    mode: 'in-memory' as const,
  };
}
