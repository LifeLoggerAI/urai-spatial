'use client';

import { useMemo } from 'react';
import type { CanonMode } from '@/lib/uraiCanon/state';

export function useCanonInputLock(mode: CanonMode) {
  return useMemo(() => ({
    skyClickEnabled: mode === 'home',
    starClickEnabled: mode === 'lifemap',
    replayEnterEnabled: mode === 'focus',
  }), [mode]);
}
