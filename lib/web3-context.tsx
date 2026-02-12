'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { WalletState } from '@/types';
import type { UserRole } from '@/types';
import {
  getWalletState,
  getUserRole,
  setUserRole as persistRole,
  clearUserRole,
  connectWallet,
  disconnectWallet,
  initializeMockData,
} from './web3';

interface Web3ContextType {
  wallet: WalletState;
  role: UserRole | null;
  setRole: (role: UserRole) => void;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
  });
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setRole = (r: UserRole) => {
    persistRole(r);
    setRoleState(r);
  };

  useEffect(() => {
    const savedState = getWalletState();
    setWallet(savedState);
    setRoleState(getUserRole());
    initializeMockData();
  }, []);

  const connect = async () => {
    setIsLoading(true);
    try {
      const newWalletState = await connectWallet();
      setWallet(newWalletState);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    disconnectWallet();
    clearUserRole();
    setWallet({
      address: null,
      isConnected: false,
      chainId: null,
    });
    setRoleState(null);
  };

  return (
    <Web3Context.Provider
      value={{ wallet, role, setRole, isLoading, connect, disconnect }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
