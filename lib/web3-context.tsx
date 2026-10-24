'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BrowserProvider } from 'ethers';
import type { UserRole, WalletState } from '@/types';
import { connectAccount, ensureNetwork, explainWalletError, requireEthereum } from '@/lib/chain/browser';
import { isContractConfigured, PUBLIC_CHAIN_ID, PUBLIC_CHAIN_NAME, PUBLIC_CONTRACT_ADDRESS } from '@/lib/config';

type ChainInfo = {
  configured: boolean;
  chainId: number;
  chainName: string;
  contractAddress: string | null;
  rpcUrl: string;
  explorerTxUrl: string | null;
};

interface Web3ContextType {
  wallet: WalletState;
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
  chain: ChainInfo;
  hasWallet: boolean;
  sessionReady: boolean;
  connect: (role: UserRole) => Promise<void>;
  connectDemo: (role: UserRole) => Promise<void>;
  disconnect: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const defaultChain: ChainInfo = {
  configured: isContractConfigured(),
  chainId: PUBLIC_CHAIN_ID,
  chainName: PUBLIC_CHAIN_NAME,
  contractAddress: PUBLIC_CONTRACT_ADDRESS || null,
  rpcUrl: '',
  explorerTxUrl: null,
};

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({ address: null, isConnected: false, chainId: null });
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chain, setChain] = useState<ChainInfo>(defaultChain);
  const [hasWallet, setHasWallet] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Detect wallet availability on client
  useEffect(() => {
    setHasWallet(typeof window !== 'undefined' && Boolean(window.ethereum));
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.chain) setChain(data.chain);
      if (data.session) {
        setWallet({
          address: data.session.address,
          isConnected: true,
          chainId: data.chain?.chainId ?? PUBLIC_CHAIN_ID,
        });
        setRole(data.session.role);
      }
    } catch {
      // Ignore network errors on session fetch
    } finally {
      setSessionReady(true);
    }
  }, []);

  useEffect(() => {
    refreshSession().catch(() => undefined);
  }, [refreshSession]);

  const connect = async (selectedRole: UserRole) => {
    setIsLoading(true);
    setError(null);
    try {
      requireEthereum();
      await ensureNetwork();
      const address = await connectAccount();
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const nonceBody = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceBody.error || 'Could not start login');
      const message = [
        'MedLedger authentication',
        `Address: ${address}`,
        `Role: ${selectedRole}`,
        `Nonce: ${nonceBody.nonce}`,
        `Issued At: ${nonceBody.issuedAt}`,
        'This signature proves control of the wallet. It is not proof of a medical license.',
      ].join('\n');
      const provider = new BrowserProvider(requireEthereum());
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          role: selectedRole,
          nonce: nonceBody.nonce,
          issuedAt: nonceBody.issuedAt,
          signature,
        }),
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyBody.error || 'Login failed');
      setWallet({ address: verifyBody.address, isConnected: true, chainId: PUBLIC_CHAIN_ID });
      setRole(verifyBody.role);
    } catch (err) {
      setError(explainWalletError(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const connectDemo = async (selectedRole: UserRole) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Demo login failed');
      setWallet({ address: body.address, isConnected: true, chainId: PUBLIC_CHAIN_ID });
      setRole(body.role);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Demo login failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setWallet({ address: null, isConnected: false, chainId: null });
    setRole(null);
  };

  return (
    <Web3Context.Provider value={{ wallet, role, isLoading, error, chain, hasWallet, sessionReady, connect, connectDemo, disconnect }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) throw new Error('useWeb3 must be used within a Web3Provider');
  return context;
}
