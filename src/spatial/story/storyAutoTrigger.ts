"use client";

import { useEffect, useRef } from "react";

type EnvironmentDetail = {
  intervention?: { interventionType?: string; shouldIntervene?: boolean };
  directive?: { mode?: string };
  prediction?: { nextLikelyState?: string };
  personality?: { dominantMode?: string };
};

export default function StoryAutoTrigger() {
  const lastTrigger = useRef(0);
  const cooldownMs = 45000; // prevent over-triggering

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const now = Date.now();
      if (now - lastTrigger.current < cooldownMs) return;

      const detail = (event as CustomEvent<EnvironmentDetail>).detail;
      if (!detail) return;

      const intervention = detail.intervention?.interventionType;
      const overloaded = detail.prediction?.nextLikelyState === "overloaded";

      // 🔥 Trigger logic (safe + intentional)
      if (intervention === "grounding" && overloaded) {
        lastTrigger.current = now;

        window.dispatchEvent(
          new CustomEvent("urai:story", {
            detail: { storyId: "thresholdReview" },
          })
        );

        return;
      }

      if (intervention === "focus") {
        lastTrigger.current = now;

        window.dispatchEvent(
          new CustomEvent("urai:story", {
            detail: { storyId: "skyToTimeline" },
          })
        );

        return;
      }

      if (detail.personality?.dominantMode === "observing") {
        lastTrigger.current = now;

        window.dispatchEvent(
          new CustomEvent("urai:story", {
            detail: { storyId: "awakening" },
          })
        );
      }
    };

    window.addEventListener("urai:environment", handler);
    return () => window.removeEventListener("urai:environment", handler);
  }, []);

  return null;
}
