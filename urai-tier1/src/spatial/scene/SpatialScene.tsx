"use client";

import HomeWorld from "./HomeWorld";
import { useSceneStore } from "../store/useSceneStore";
import LifeMapStarfield from "../components/LifeMapStarfield";
import { CinematicCameraRig } from "../components/CinematicCameraRig";

export default function SpatialScene() {
  const phase = useSceneStore((s) => s.phase);

  return (
    <>
      <CinematicCameraRig phase={phase} />
      <HomeWorld />
      <LifeMapStarfield phase={phase} />
    </>
  );
}
