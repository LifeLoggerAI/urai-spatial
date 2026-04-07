'use client';

import { useEffect } from 'react';
import type { CanonMode } from '@/lib/uraiCanon/state';
import { escUnwind } from '@/lib/uraiCanon/state';

export function useCanonEsc(
  mode: CanonMode,
  setMode: (m: CanonMode) => void,
  clearSelection?: () => void
): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Escape') return;
      const next = escUnwind(mode);
      if (next === mode) return;
      e.preventDefault();
      if (next === 'home' && clearSelection) clearSelection();
      setMode(next);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, setMode, clearSelection]);
}
