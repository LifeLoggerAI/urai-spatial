"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";

import Starfield from "./Starfield";
import CameraRig from "./CameraRig";
import MemorySphere from "./MemorySphere";

import { useSpatialStore } from "@/stores/spatialStore";
import { STAR_DATA } from "@/engine/data/starData";

export default function MainScene() {
  // 1. Read the single source of truth for selection.
  const { selectedStarId } = useSpatialStore((s) => ({ selectedStarId: s.selectedStarId }));

  // 2. Derive the selected star object deterministically from the ID.
  // This lookup is the core of the deterministic rendering pipeline.
  const selectedStar = useMemo(() => {
    if (!selectedStarId) return null;
    return STAR_DATA.find((star) => star.id === selectedStarId) || null;
  }, [selectedStarId]);

  return (
    <Canvas camera={{ position: [0, 6, 12], fov: 60 }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />

      {/* The CameraRig also reads from the store to deterministically move the camera */}
      <CameraRig />

      <Starfield />

      {/*
       * 3. The MemorySphere renders ONLY if a valid star object is found.
       * Its position is derived directly from the deterministic star data.
       * This eliminates the possibility of rendering a sphere in the wrong location.
       */}
      {selectedStar && <MemorySphere position={selectedStar.position} />}
    </Canvas>
  );
}
