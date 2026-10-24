'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuditLog, MedicalRecord } from '@/types';
import { useWeb3 } from './web3-context';

interface RecordsContextType {
  records: MedicalRecord[];
  accessLogs: AuditLog[];
  loading: boolean;
  error: string | null;
  refreshRecords: () => Promise<void>;
  refreshLogs: () => Promise<void>;
}

const RecordsContext = createContext<RecordsContextType | undefined>(undefined);

export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const { wallet } = useWeb3();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [accessLogs, setAccessLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRecords = useCallback(async () => {
    if (!wallet.isConnected) {
      setRecords([]);
      return;
    }
    const res = await fetch('/api/records');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not load records');
      setRecords([]);
      return;
    }
    setError(null);
    setRecords(data.records || []);
  }, [wallet.isConnected]);

  const refreshLogs = useCallback(async () => {
    if (!wallet.isConnected) {
      setAccessLogs([]);
      return;
    }
    const res = await fetch('/api/audit');
    const data = await res.json();
    if (!res.ok) {
      setAccessLogs([]);
      return;
    }
    setAccessLogs(data.entries || []);
  }, [wallet.isConnected]);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshRecords(), refreshLogs()]).finally(() => setLoading(false));
  }, [refreshRecords, refreshLogs]);

  return (
    <RecordsContext.Provider value={{ records, accessLogs, loading, error, refreshRecords, refreshLogs }}>
      {children}
    </RecordsContext.Provider>
  );
}

export function useRecords() {
  const context = useContext(RecordsContext);
  if (!context) throw new Error('useRecords must be used within a RecordsProvider');
  return context;
}
