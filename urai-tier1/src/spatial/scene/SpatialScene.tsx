"use client";

import { useState } from "react";
import HomeSceneBackground from "@/spatial/home/HomeSceneBackground";
import HomeOrb from "@/spatial/home/HomeOrb";
import HomeOverlay from "@/spatial/home/HomeOverlay";

const PHASES = ["HOME", "ASCENT", "LIFEMAP", "FOCUS", "REPLAY"] as const;

type Phase = (typeof PHASES)[number];

const copy: Record<Phase, { title: string; body: string; action: string }> = {
  HOME: {
    title: "URAI Spatial",
    body: "A cinematic life-state engine for memory, emotion, replay, and meaning.",
    action: "Begin ascent",
  },
  ASCENT: {
    title: "Ascent",
    body: "The sky opens into a navigable life map.",
    action: "Enter LifeMap",
  },
  LIFEMAP: {
    title: "LifeMap",
    body: "Memory stars arrange into a symbolic field of patterns and signals.",
    action: "Focus memory",
  },
  FOCUS: {
    title: "Focus",
    body: "One memory becomes clear enough to inspect, narrate, and understand.",
    action: "Open replay",
  },
  REPLAY: {
    title: "Replay",
    body: "URAI replays the emotional shape of the memory and prepares the unwind.",
    action: "Return focus",
  },
};

export function SpatialScene() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = PHASES[phaseIndex];
  const state = copy[phase];

  const advance = () => {
    if (phase === "REPLAY") {
      setPhaseIndex(3);
      return;
    }

    setPhaseIndex((value) => Math.min(value + 1, PHASES.length - 1));
  };

  const unwind = () => {
    setPhaseIndex((value) => Math.max(value - 1, 0));
  };

  const previewMap = () => {
    setPhaseIndex(2);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05010d] text-white">
      <HomeSceneBackground />
      <HomeOrb />
      <HomeOverlay
        phase={phase}
        title={state.title}
        body={state.body}
        action={state.action}
        onAdvance={advance}
        onUnwind={unwind}
        onPreviewMap={previewMap}
      />
    </main>
  );
}

export default SpatialScene;
