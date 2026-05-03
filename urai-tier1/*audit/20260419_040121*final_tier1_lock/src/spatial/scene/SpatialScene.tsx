"use client";

import { Canvas } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { Fog } from "three";
import type { StarPoint } from "@/lib/uraiCanon/types";
import { useCanonEsc } from "@/spatial/hooks/useCanonEsc";
import { useSceneAuthority } from "@/spatial/hooks/useSceneAuthority";
import { CinematicCameraRig } from "@/spatial/components/CinematicCameraRig";
import { HomeEnvironment } from "@/spatial/components/HomeEnvironment";
import { LifeMapStarfield } from "@/spatial/components/LifeMapStarfield";
import { FocusSubject } from "@/spatial/components/FocusSubject";
import { ReplayScene } from "@/spatial/components/ReplayScene";

function buildStars(): StarPoint[] {
  return [
    { id: "star-1", position: [-8.5, 2.4, -30], size: 0.24, intensity: 0.92, color: "#dbe7ff" },
    { id: "star-2", position: [-5.2, -0.2, -34], size: 0.18, intensity: 0.86, color: "#9fc3ff" },
    { id: "star-3", position: [-1.1, 2.8, -38], size: 0.22, intensity: 0.88, color: "#d6e6ff" },
    { id: "star-4", position: [2.6, 0.9, -42], size: 0.18, intensity: 0.8, color: "#b3cfff" },
    { id: "star-5", position: [6.3, 2.2, -46], size: 0.23, intensity: 0.9, color: "#dce8ff" },
    { id: "star-6", position: [8.8, -1.1, -50], size: 0.17, intensity: 0.78, color: "#a6c4ff" },
    { id: "star-7", position: [-9.4, -2.1, -55], size: 0.18, intensity: 0.8, color: "#aac7ff" },
    { id: "star-8", position: [-2.4, -1.7, -60], size: 0.2, intensity: 0.84, color: "#dce7ff" },
    { id: "star-9", position: [3.8, -2.2, -66], size: 0.2, intensity: 0.82, color: "#c5d8ff" },
    { id: "star-10", position: [0.5, 3.2, -72], size: 0.24, intensity: 0.94, color: "#ebf2ff" },
  ];
}

export default function SpatialScene() {
  const authority = useSceneAuthority();
  const stars = useMemo(() => buildStars(), []);
  const selectedStar = useMemo(
    () => stars.find((star) => star.id === authority.selectedStarId) ?? null,
    [authority.selectedStarId, stars],
  );
  const [hoveredStarId, setHoveredStarId] = useState<string | null>(null);

  useCanonEsc(authority.escape);

  const homeDim =
    authority.phase === "HOME"
      ? 0
      : authority.phase === "ASCENT"
        ? 0.06
        : 0.82;

  const showReplayEnvelope =
    authority.phase === "REPLAY" || authority.transitionState === "close_replay";

  const focusOpacity =
    authority.phase === "FOCUS" || authority.phase === "REPLAY" ? 1 : 0.7;

  return (
    <div style={{ position: "fixed", inset: 0, width: "100%", height: "100vh", background: "#020611" }}>
      <Canvas
        camera={{ position: [0, 2.4, 12.5], fov: 44, near: 0.1, far: 240 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#020611"]} />
        <primitive object={new Fog("#020611", 16, 140)} attach="fog" />

        <ambientLight intensity={0.5} />
        <directionalLight position={[6, 10, 5]} intensity={1.1} color="#dbe7ff" />
        <pointLight position={[0, 1.4, -7.2]} intensity={2.1} color="#8caeff" distance={22} />

        <CinematicCameraRig
          phase={authority.phase}
          selected={selectedStar?.position}
          
          
          
        />

        <HomeEnvironment
          visible
          interactive={authority.phase === "HOME"}
          phase={authority.phase}
          dim={homeDim}
          onSkySelect={authority.beginAscent}
          onGroundSelect={authority.beginAscent}
          onOrbSelect={authority.beginAscent}
        />

        <LifeMapStarfield
          visible={authority.phase !== "HOME"}
          stars={stars}
          selectedStarId={authority.selectedStarId}
          onHoverStar={setHoveredStarId}
          onSelectStar={(id) => {
            if (authority.phase === "LIFEMAP") authority.openFocus(id);
          }}
          focusSuppression={authority.phase === "FOCUS" || authority.phase === "REPLAY" ? 0.32 : 0}
        />

        <FocusSubject
          visible={authority.phase === "FOCUS" || authority.phase === "REPLAY"}
          starId={selectedStar?.id ?? hoveredStarId}
          position={selectedStar?.position ?? [0, 1.8, -34]}
          interactive={authority.phase === "FOCUS"}
          opacity={focusOpacity}
          onEnterReplay={() => authority.openReplay(authority.selectedStarId)}
        />

        <ReplayScene
          visible={showReplayEnvelope}
          starId={selectedStar?.id ?? null}
          anchor={selectedStar?.position ?? [0, 1.8, -34]}
          opacity={authority.phase === "REPLAY" ? 1 : 0.82}
        />

        <mesh
          visible={authority.phase === "REPLAY"}
          position={[0, -1000, 0]}
          onPointerDown={() => authority.closeReplay()}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      </Canvas>
    </div>
  );
}
