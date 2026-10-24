export function formatAddress(address: string) {
  if (!address) return '';
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export function isValidAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
