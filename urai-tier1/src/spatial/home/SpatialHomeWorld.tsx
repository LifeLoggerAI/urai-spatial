"use client";

import { useRouter } from "next/navigation";
import { useHomeWorldState } from "./useHomeWorldState";
import { useAscentTransition } from "./motion/useAscentTransition";
import HomeScene from "./visual/HomeScene";

export default function SpatialHomeWorld({ userId = "demo-user" }: { userId?: string }) {
  const router = useRouter();
  const { state, loading } = useHomeWorldState(userId);
  const { opening, enter } = useAscentTransition("/life-map");

  return (
    <div
      data-testid="urai-spatial-stage"
      data-camera={opening ? "ascent" : "home"}
      data-loading={loading}
      data-ground-tier={state.groundTier}
      data-orb-tier={state.orbTier}
      data-sky-tier={state.skyTier}
      data-mood={state.moodState}
      data-recovery={state.recoveryState}
      data-energy={Math.round(state.energyScore)}
      data-narrator-speaking={state.narratorSpeaking}
    >
      <HomeScene
        homeWorldState={state}
        state={opening ? "enteringLifeMap" : "home"}
        opening={opening}
        enterLifeMap={enter}
        onReplay={() => router.push("/replay", { scroll: false })}
        onUnwind={() => router.push("/mirror", { scroll: false })}
        onFocus={() => router.push("/focus", { scroll: false })}
      />
    </div>
  );
}
