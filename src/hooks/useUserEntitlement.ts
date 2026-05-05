'use client';

import { useEffect, useState } from 'react';
import { firebaseAuth } from '@/lib/firebaseClient';

export function useUserEntitlement() {
  const [userId, setUserId] = useState<string>('local');
  const [entitlement, setEntitlement] = useState<any>(null);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/entitlement?userId=${userId}`);
      const data = await res.json();
      setEntitlement(data.entitlement);
    }
    load();
  }, [userId]);

  return { userId, entitlement };
}
