'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebaseClient';
import type { UserEntitlement } from '@/components/spatial/stripePlanGate';

export type EntitlementLoadState = 'loading' | 'authenticated' | 'anonymous' | 'error';

export function useUserEntitlement() {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<UserEntitlement | null>(null);
  const [status, setStatus] = useState<EntitlementLoadState>('loading');
  const [error, setError] = useState<string | null>(null);

  const refreshEntitlement = useCallback(async (currentUser = firebaseAuth.currentUser) => {
    if (!currentUser) {
      setUser(null);
      setUserId(null);
      setEntitlement(null);
      setStatus('anonymous');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/entitlement', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Unable to fetch entitlement: ${response.status}`);

      const data = await response.json();
      setEntitlement(data.entitlement ?? null);
      setStatus('authenticated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch entitlement.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setUserId(currentUser?.uid ?? null);
      refreshEntitlement(currentUser);
    });
    return () => unsub();
  }, [refreshEntitlement]);

  return { user, userId, entitlement, status, error, refreshEntitlement };
}
