"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchHomeWorldBundle } from "@/lib/firebase/homeWorld";
import { demoHomeWorldState, sparseHomeWorldState } from "./homeWorldDefaults";
import { explainHomeWorldState } from "./explainHomeWorldState";
import type { HomeWorldExplanation, HomeWorldState } from "./homeWorldTypes";

type HomeWorldSource = "firestore" | "demo-fallback" | "local";

function wantsDemo(userId: string, demoMode?: boolean) {
  return Boolean(demoMode || userId === "demo-user");
}

function fallbackBundle(userId: string, demoMode?: boolean) {
  const state = { ...(wantsDemo(userId, demoMode) ? demoHomeWorldState : sparseHomeWorldState), userId };
  return {
    state,
    explanation: explainHomeWorldState(state),
    source: wantsDemo(userId, demoMode) ? ("demo-fallback" as const) : ("local" as const),
  };
}

export function useHomeWorldState(userId = "demo-user", opts?: { demoMode?: boolean }) {
  const initial = fallbackBundle(userId, opts?.demoMode);
  const [state, setState] = useState<HomeWorldState>(initial.state);
  const [explanation, setExplanation] = useState<HomeWorldExplanation>(initial.explanation);
  const [source, setSource] = useState<HomeWorldSource>(initial.source);
  const [loading, setLoading] = useState(Boolean(userId && !wantsDemo(userId, opts?.demoMode)));

  const refresh = useCallback(async () => {
    setLoading(Boolean(userId && !wantsDemo(userId, opts?.demoMode)));
    try {
      const bundle = await fetchHomeWorldBundle(userId, opts);
      setState(bundle.state);
      setExplanation(bundle.explanation);
      setSource(bundle.source);
    } catch (error) {
      console.warn("[HomeWorld] Failed to refresh Home World state", error);
      const fallback = fallbackBundle(userId, opts?.demoMode);
      setState(fallback.state);
      setExplanation(fallback.explanation);
      setSource(fallback.source);
    } finally {
      setLoading(false);
    }
  }, [opts, userId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(Boolean(userId && !wantsDemo(userId, opts?.demoMode)));
      try {
        const bundle = await fetchHomeWorldBundle(userId, opts);
        if (!cancelled) {
          setState(bundle.state);
          setExplanation(bundle.explanation);
          setSource(bundle.source);
        }
      } catch (error) {
        console.warn("[HomeWorld] Falling back after Firebase failure", error);
        if (!cancelled) {
          const fallback = fallbackBundle(userId, opts?.demoMode);
          setState(fallback.state);
          setExplanation(fallback.explanation);
          setSource(fallback.source);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [opts, userId]);

  return { state, setState, explanation, loading, source, refresh };
}
