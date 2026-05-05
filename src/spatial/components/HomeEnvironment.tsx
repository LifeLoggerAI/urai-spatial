"use client";

import { useMemo } from "react";

import Orb from "./Orb";
import GroundWorld from "../scene/GroundWorld";
import SkyStarfield from "../scene/Starfield";
import type { SceneMode } from "../state/sceneStore";

type CameraState = {
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
};

type HomeEnvironmentProps = {
  mode: SceneMode;
  transitionProgress: number;
  reducedMotion: boolean;
  camera: CameraState;
  onEnterLifeMap: () => void;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export default function HomeEnvironment({
  mode,
  transitionProgress,
  reducedMotion,
  camera,
  onEnterLifeMap,
}: HomeEnvironmentProps) {
  const homeActive = mode === "home";
  const opacity = useMemo(() => {
    if (!homeActive) return 0;
    return 1 - clamp01(transitionProgress) * (reducedMotion ? 0.2 : 0.35);
  }, [homeActive, reducedMotion, transitionProgress]);

  return (
    <group visible={homeActive}>
      <group>
        <SkyStarfield />
      </group>

      <group>
        <GroundWorld />
      </group>

      <group>
        <mesh position={[-0.52, 1.58, -0.36]} castShadow>
          <capsuleGeometry args={[0.22, 0.76, 8, 16]} />
          <meshStandardMaterial color="#cedfff" emissive="#4ba5ff" emissiveIntensity={0.35} transparent opacity={opacity} />
        </mesh>
      </group>

      <group>
        <Orb interactive={homeActive} active={homeActive && !reducedMotion} onClick={onEnterLifeMap} />
      </group>

      <group position={camera.position} visible={false} />
    </group>
  );
}
