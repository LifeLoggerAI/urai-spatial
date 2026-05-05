"use client";

import { useEffect, useMemo, useRef } from "react";
import HomeWorld from "./HomeWorld";
import { useSceneStore } from "../store/useSceneStore";
import LifeMapStarfield, { LIFE_MAP_STARS, type LifeMapStar } from "../components/LifeMapStarfield";
import { CinematicCameraRig } from "../components/CinematicCameraRig";

type ReplayNarratorCue = {
  event: "narrator.focus.arrive" | "narrator.replay.begin" | "narrator.replay.pulse";
  phase: string;
  starId: string;
  title: string | null;
  tone: string | null;
  symbolicWeight: string | null;
  script: string;
  voice: {
    mode: "whisper" | "reflective" | "cinematic";
    pace: "slow" | "measured";
    intensity: "low" | "medium";
  };
  timing: {
    delayMs: number;
    durationMs: number;
    beat: "arrival" | "immersion" | "pulse";
  };
  timestamp: number;
};

function emitReplayNarratorCue(detail: Omit<ReplayNarratorCue, "timestamp">) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ReplayNarratorCue>("urai:narrator", {
      detail: {
        ...detail,
        timestamp: Date.now(),
      },
    }),
  );
}

function scriptForStar(star: LifeMapStar, phase: string) {
  const title = star.title ?? "this memory";
  const tone = star.tone ?? "quiet";
  const weight = star.symbolicWeight ?? "subtle";

  if (phase === "REPLAY") {
    return `Replay opening for ${title}. Tone: ${tone}. Weight: ${weight}. Let the memory arrive slowly.`;
  }

  return `Focusing on ${title}. Tone: ${tone}. Weight: ${weight}. Stay with what this point is trying to show.`;
}

export default function SpatialScene() {
  const phase = useSceneStore((s) => s.phase);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const selectedStarPosition = useSceneStore((s) => s.selectedStarPosition);
  const focusStar = useSceneStore((s) => s.focusStar);
  const lastCueKey = useRef<string | null>(null);

  const selectedStar = useMemo(
    () => LIFE_MAP_STARS.find((star) => star.id === selectedStarId) ?? null,
    [selectedStarId],
  );

  useEffect(() => {
    if (!selectedStar || (phase !== "FOCUS" && phase !== "REPLAY")) return;

    const cueKey = `${phase}:${selectedStar.id}`;
    if (lastCueKey.current === cueKey) return;
    lastCueKey.current = cueKey;

    const isReplay = phase === "REPLAY";

    const delayMs = isReplay ? 450 : 220;
    const timeout = window.setTimeout(() => {
      emitReplayNarratorCue({
        event: isReplay ? "narrator.replay.begin" : "narrator.focus.arrive",
        phase,
        starId: selectedStar.id,
        title: selectedStar.title ?? null,
        tone: selectedStar.tone ?? null,
        symbolicWeight: selectedStar.symbolicWeight ?? null,
        script: scriptForStar(selectedStar, phase),
        voice: {
          mode: isReplay ? "cinematic" : "reflective",
          pace: "slow",
          intensity: selectedStar.symbolicWeight === "heavy" || selectedStar.symbolicWeight === "threshold" ? "medium" : "low",
        },
        timing: {
          delayMs,
          durationMs: isReplay ? 5200 : 3200,
          beat: isReplay ? "immersion" : "arrival",
        },
      });
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [phase, selectedStar]);

  return (
    <>
      <CinematicCameraRig phase={phase} selectedStarPosition={selectedStarPosition} />
      <HomeWorld />
      <LifeMapStarfield
        phase={phase}
        selectedStarId={selectedStarId}
        onSelectStar={(star) => focusStar(star.id, star.position ?? [0, 18, -220])}
      />
    </>
  );
}
