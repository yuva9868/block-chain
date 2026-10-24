export const PUBLIC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '31337');
export const PUBLIC_CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || 'Hardhat Local';
export const PUBLIC_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
export const PUBLIC_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '').trim();
export const PUBLIC_EXPLORER_TX_URL = (process.env.NEXT_PUBLIC_EXPLORER_TX_URL || '').replace(/\/$/, '');
export const PUBLIC_NATIVE_CURRENCY = process.env.NEXT_PUBLIC_NATIVE_CURRENCY || 'ETH';

export function isContractConfigured() {
  return /^0x[a-fA-F0-9]{40}$/.test(PUBLIC_CONTRACT_ADDRESS);
}

export function explorerTxUrl(txHash: string) {
  if (!PUBLIC_EXPLORER_TX_URL || !txHash) return null;
  return `${PUBLIC_EXPLORER_TX_URL}/${txHash}`;
}

export function hexChainId() {
  return '0x' + PUBLIC_CHAIN_ID.toString(16);
}
