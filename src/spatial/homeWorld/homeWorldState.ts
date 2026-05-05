import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type HomeWorldTier = 0 | 1 | 2 | 3;
export type HomeWorldMood = "calm" | "focused" | "anxious" | "heavy" | "restored" | "threshold";
export type HomeWorldRecovery = "idle" | "recovering" | "blooming" | "integrated";

export type HomeWorldState = {
  groundTier: HomeWorldTier;
  orbTier: HomeWorldTier;
  skyTier: HomeWorldTier;
  moodState: HomeWorldMood;
  recoveryState: HomeWorldRecovery;
  energyScore: number;
  narratorSpeaking: boolean;
  updatedAt?: number;
};

export const HOME_WORLD_DEMO_USER_ID = "demo-user";
export const HOME_WORLD_STATE_RELATIVE_PATH = "homeWorld/state";

export const demoHomeWorldState: HomeWorldState = {
  groundTier: 3,
  orbTier: 3,
  skyTier: 3,
  moodState: "threshold",
  recoveryState: "blooming",
  energyScore: 92,
  narratorSpeaking: false,
  updatedAt: 0,
};

export function homeWorldStatePath(userId = HOME_WORLD_DEMO_USER_ID) {
  return `users/${userId}/${HOME_WORLD_STATE_RELATIVE_PATH}`;
}

function clampTier(value: unknown, fallback: HomeWorldTier): HomeWorldTier {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : fallback;
}

function clampEnergy(value: unknown) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : demoHomeWorldState.energyScore;
  return Math.max(0, Math.min(100, n));
}

function normalizeMood(value: unknown): HomeWorldMood {
  return value === "calm" || value === "focused" || value === "anxious" || value === "heavy" || value === "restored" || value === "threshold" ? value : demoHomeWorldState.moodState;
}

function normalizeRecovery(value: unknown): HomeWorldRecovery {
  return value === "idle" || value === "recovering" || value === "blooming" || value === "integrated" ? value : demoHomeWorldState.recoveryState;
}

export function normalizeHomeWorldState(value: Partial<HomeWorldState> | undefined): HomeWorldState {
  return {
    groundTier: clampTier(value?.groundTier, demoHomeWorldState.groundTier),
    orbTier: clampTier(value?.orbTier, demoHomeWorldState.orbTier),
    skyTier: clampTier(value?.skyTier, demoHomeWorldState.skyTier),
    moodState: normalizeMood(value?.moodState),
    recoveryState: normalizeRecovery(value?.recoveryState),
    energyScore: clampEnergy(value?.energyScore),
    narratorSpeaking: Boolean(value?.narratorSpeaking),
    updatedAt: typeof value?.updatedAt === "number" ? value.updatedAt : Date.now(),
  };
}

export function homeWorldDataAttrs(state: HomeWorldState) {
  return {
    "data-ground-tier": String(state.groundTier),
    "data-orb-tier": String(state.orbTier),
    "data-sky-tier": String(state.skyTier),
    "data-mood": state.moodState,
    "data-recovery": state.recoveryState,
    "data-energy-score": String(state.energyScore),
    "data-narrator-speaking": state.narratorSpeaking ? "true" : "false",
  } as const;
}

export function useHomeWorldState(userId = HOME_WORLD_DEMO_USER_ID) {
  const [state, setState] = useState<HomeWorldState>(demoHomeWorldState);
  const [source, setSource] = useState<"demo" | "firestore">("demo");
  const [error, setError] = useState<string | null>(null);
  const path = useMemo(() => homeWorldStatePath(userId), [userId]);

  useEffect(() => {
    if (!db) {
      setState(demoHomeWorldState);
      setSource("demo");
      return;
    }
    const ref = doc(db, path);
    let seeded = false;
    const unsubscribe = onSnapshot(ref, async (snapshot) => {
      setSource("firestore");
      setError(null);
      if (!snapshot.exists()) {
        if (!seeded) {
          seeded = true;
          await setDoc(ref, { ...demoHomeWorldState, updatedAt: Date.now() }, { merge: true });
        }
        return;
      }
      setState(normalizeHomeWorldState(snapshot.data() as Partial<HomeWorldState>));
    }, (err) => {
      setState(demoHomeWorldState);
      setSource("demo");
      setError(err.message);
    });
    return () => unsubscribe();
  }, [path]);

  return { state, source, error, path };
}
