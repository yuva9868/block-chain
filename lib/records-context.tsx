'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { MedicalRecord, AccessLog } from '@/types';
import { getRecords, getAccessLogs } from './web3';

interface RecordsContextType {
  records: MedicalRecord[];
  accessLogs: AccessLog[];
  refreshRecords: () => void;
  refreshLogs: () => void;
}

const RecordsContext = createContext<RecordsContextType | undefined>(undefined);

export function RecordsProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);

  const refreshRecords = () => {
    setRecords(getRecords());
  };

  const refreshLogs = () => {
    setAccessLogs(getAccessLogs());
  };

  // Load initial data
  useEffect(() => {
    refreshRecords();
    refreshLogs();
  }, []);

  return (
    <RecordsContext.Provider
      value={{ records, accessLogs, refreshRecords, refreshLogs }}
    >
      {children}
    </RecordsContext.Provider>
  );
}

export function useRecords() {
  const context = useContext(RecordsContext);
  if (!context) {
    throw new Error('useRecords must be used within a RecordsProvider');
  }
  return context;
}
