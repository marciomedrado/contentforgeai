
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getActiveEmpresaId as getStoredActiveEmpresaId, setActiveEmpresaId as setStoredActiveEmpresaId } from '@/lib/storageService';
import { ACTIVE_EMPRESA_ID_STORAGE_KEY } from '@/lib/constants';

export function useActiveEmpresa(): [string | null, (empresaId: string | null) => void] {
  const [activeEmpresaId, setActiveEmpresaIdState] = useState<string | null>(null);

  useEffect(() => {
    // Initialize state from localStorage on mount
    setActiveEmpresaIdState(getStoredActiveEmpresaId());

    // Listen for storage changes to sync across tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ACTIVE_EMPRESA_ID_STORAGE_KEY) {
        try {
          const newValue = event.newValue ? JSON.parse(event.newValue) : null;
          setActiveEmpresaIdState(newValue);
        } catch (error) {
          console.error("Error parsing activeEmpresaId from storage event:", error);
          setActiveEmpresaIdState(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setActiveEmpresa = useCallback((empresaId: string | null) => {
    setStoredActiveEmpresaId(empresaId); // This will also trigger the storage event
    // setActiveEmpresaIdState(empresaId); // State will be updated by storage event listener
  }, []);

  return [activeEmpresaId, setActiveEmpresa];
}
