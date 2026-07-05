"use client";

import { useEffect, useRef } from "react";

type XRFeedbackEvent = {
  type: string;
  payload?: any;
  timestamp: number;
};

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
    xrFeedback?: XRFeedbackEvent[];
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

  const feedbackRef = useRef<XRFeedbackEvent[]>([]);

  // --- XR FEEDBACK LOOP ---
  useEffect(() => {
    const handler = (e: any) => {
      feedbackRef.current.push({
        type: e?.detail?.type || "unknown",
        payload: e?.detail?.payload,
        timestamp: Date.now()
      });

      // keep bounded memory
      if (feedbackRef.current.length > 50) {
        feedbackRef.current = feedbackRef.current.slice(-50);
      }
    };

    window.addEventListener("xr:event", handler);
    return () => window.removeEventListener("xr:event", handler);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const ctx = getContext?.();
      if (!ctx) return;

      const feedback = feedbackRef.current;

      const {
        historyLength,
        branchCount,
        currentBranchId,
        branches
      } = ctx;

      const pressure = historyLength / 20;
      const instability = branchCount / 5;
      const interactionLoad = feedback.length / 10;

      // 🧠 fork decision influenced by user interaction
      if (pressure + interactionLoad > 1.2) {
        forkAt?.(Math.max(0, historyLength - 5));
      }

      // 🔀 merge influenced by instability + low interaction clarity
      if (instability > 1 && interactionLoad > 0.5) {
        const keys = Object.keys(branches || {});
        const a = keys[Math.floor(Math.random() * keys.length)];
        const b = keys[Math.floor(Math.random() * keys.length)];

        if (a && b && a !== b) {
          mergeBranches?.(a, b);
        }
      }

      // 🧬 synthesis influenced by anomalous interaction patterns
      if (feedback.length > 8 && Math.random() > 0.6) {
        synthesizeReality?.();
      }

    }, 3000);

    return () => clearInterval(interval);
  }, [enabled, forkAt, mergeBranches, synthesizeReality, getContext]);

  return null;
}
