"use client";

import { useEffect, useMemo, useRef } from "react";
import HomeWorld from "./HomeWorld";
import { useSceneStore } from "../store/useSceneStore";
import LifeMapStarfield, { LIFE_MAP_STARS, type LifeMapStar } from "../components/LifeMapStarfield";
import { CinematicCameraRig } from "../components/CinematicCameraRig";
import NarratorVoiceBridge from "../narrator/NarratorVoiceBridge";

export default function SpatialScene() {
  const phase = useSceneStore((s) => s.phase);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const selectedStarPosition = useSceneStore((s) => s.selectedStarPosition);
  const focusStar = useSceneStore((s) => s.focusStar);

  return (
    <>
      <NarratorVoiceBridge />
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
