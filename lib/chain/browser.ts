import { BrowserProvider, Contract, getAddress } from 'ethers';
import { MED_LEDGER_ABI } from '@/lib/abi/MedLedger';
import {
  hexChainId,
  isContractConfigured,
  PUBLIC_CHAIN_ID,
  PUBLIC_CHAIN_NAME,
  PUBLIC_CONTRACT_ADDRESS,
  PUBLIC_NATIVE_CURRENCY,
  PUBLIC_RPC_URL,
} from '@/lib/config';

export function requireEthereum() {
  if (!window.ethereum) {
    throw new Error('No injected wallet found. Install MetaMask or a compatible wallet.');
  }
  return window.ethereum;
}

export async function getProvider() {
  return new BrowserProvider(requireEthereum());
}

export async function connectAccount() {
  const accounts = (await requireEthereum().request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts?.[0]) throw new Error('Wallet connection was rejected.');
  return getAddress(accounts[0]);
}

export async function ensureNetwork() {
  const ethereum = requireEthereum();
  const current = await ethereum.request({ method: 'eth_chainId' });
  if (String(current).toLowerCase() === hexChainId().toLowerCase()) return;
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId() }],
    });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? Number((error as { code: number }).code) : 0;
    if (code === 4902 || code === -32603) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hexChainId(),
            chainName: PUBLIC_CHAIN_NAME,
            rpcUrls: [PUBLIC_RPC_URL],
            nativeCurrency: { name: PUBLIC_NATIVE_CURRENCY, symbol: PUBLIC_NATIVE_CURRENCY, decimals: 18 },
          },
        ],
      });
      return;
    }
    throw new Error('Please switch your wallet to the configured MedLedger network.');
  }
}

export async function getContract() {
  if (!isContractConfigured()) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Deploy the contract and configure .env.local.');
  }
  await ensureNetwork();
  const provider = await getProvider();
  const signer = await provider.getSigner();
  return new Contract(PUBLIC_CONTRACT_ADDRESS, MED_LEDGER_ABI, signer);
}

function toBytes32(hex: string) {
  const clean = hex.replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) throw new Error('Expected a 32-byte hex value');
  return '0x' + clean;
}

export function explainWalletError(error: unknown) {
  const err = error as { code?: number | string; shortMessage?: string; reason?: string; message?: string };
  if (err?.code === 4001 || err?.code === 'ACTION_REJECTED') return 'Wallet request was rejected.';
  if (String(err?.message || '').includes('insufficient funds')) return 'Insufficient funds for gas on this network.';
  if (err?.shortMessage) return err.shortMessage;
  if (err?.reason) return err.reason;
  if (err instanceof Error) return err.message;
  return 'Blockchain request failed.';
}

export async function sendRegisterRecord(recordId: string, contentHash: string) {
  const contract = await getContract();
  const tx = await contract.registerRecord(toBytes32(recordId), toBytes32(contentHash));
  return { hash: tx.hash as string, wait: () => tx.wait() };
}

export async function sendAmendRecord(recordId: string, newContentHash: string) {
  const contract = await getContract();
  const tx = await contract.amendRecord(toBytes32(recordId), toBytes32(newContentHash));
  return { hash: tx.hash as string, wait: () => tx.wait() };
}

export async function sendGrantAccess(recordId: string, doctor: string) {
  const contract = await getContract();
  const tx = await contract.grantAccess(toBytes32(recordId), getAddress(doctor));
  return { hash: tx.hash as string, wait: () => tx.wait() };
}

export async function sendRevokeAccess(recordId: string, doctor: string) {
  const contract = await getContract();
  const tx = await contract.revokeAccess(toBytes32(recordId), getAddress(doctor));
  return { hash: tx.hash as string, wait: () => tx.wait() };
}

export { PUBLIC_CHAIN_ID, PUBLIC_CHAIN_NAME, PUBLIC_CONTRACT_ADDRESS };
