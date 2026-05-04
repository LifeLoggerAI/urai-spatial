"use client";

import { useEffect, useState } from "react";
import { fetchHomeWorldState } from "@/lib/firebase/homeWorld";
import { defaultHomeWorldState } from "./homeWorldDefaults";
import type { HomeWorldState } from "./homeWorldTypes";

export function useHomeWorldState(userId = "demo-user") {
  const [state, setState] = useState<HomeWorldState>({ ...defaultHomeWorldState, userId });
  const [loading, setLoading] = useState(Boolean(userId && userId !== "demo-user"));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(Boolean(userId && userId !== "demo-user"));
      const nextState = await fetchHomeWorldState(userId);
      if (!cancelled) {
        setState(nextState);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { state, setState, loading };
}
