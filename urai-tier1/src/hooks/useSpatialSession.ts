"use client";

import { Timestamp } from "firebase/firestore";
import type { SpatialSession } from "@/lib/firebase/firebaseSpatialSchema";
import { DEMO_USER_ID } from "@/lib/spatial/publicSafeSpatialData";

export function useSpatialSession() {
  const session: SpatialSession = {
    userId: DEMO_USER_ID,
    startedAt: Timestamp.now(),
    deviceType: typeof window !== "undefined" && window.innerWidth < 640 ? "mobile" : "desktop",
    interactions: [],
    enteredRealms: ["home"],
  };

  return { session, trackInteraction: (_type: string, _targetId?: string) => undefined };
}
