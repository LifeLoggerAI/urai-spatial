"use client";

import { useEffect } from "react";

type EvolutionDeps = {
  enabled?: boolean;
  forkAt?: (index: number) => void;
  mergeBranches?: (a: string, b: string) => void;
  synthesizeReality?: (ids?: string[]) => any;
  getContext?: () => {
    historyLength: number;
    branchCount: number;
    currentBranchId: string;
    branches: Record<string, any>;
  };
};

export function useUniverseEvolutionLoop(deps: EvolutionDeps) {
  const {
    enabled = true,
    forkAt,
    mergeBranches,
    synthesizeReality,
    getContext
  } = deps;

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const ctx = getContext?.();
      if (!ctx) return;

      const { historyLength, branchCount, currentBranchId, branches } = ctx;

      // rule 1: fork when local history grows
      if (historyLength > 20) {
        forkAt?.(Math.max(0, historyLength - 5));
      }

      // rule 2: merge when too many branches exist
      if (branchCount > 4) {
        const keys = Object.keys(branches || {});
        const a = keys[Math.floor(Math.random() * keys.length)];
        const b = keys[Math.floor(Math.random() * keys.length)];

        if (a && b && a !== b) {
          mergeBranches?.(a, b);
        }
      }

      // rule 3: periodic synthesis snapshot
      if (Math.random() > 0.7) {
        synthesizeReality?.();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [enabled, forkAt, mergeBranches, synthesizeReality, getContext]);
}
