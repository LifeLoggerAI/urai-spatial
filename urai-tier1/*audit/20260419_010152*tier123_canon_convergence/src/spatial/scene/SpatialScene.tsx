"use client";
import { Color } from "three";

const SKY_TOP = new Color("#0a1a2f");
const SKY_BOTTOM = new Color("#020611");

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";

import { useSceneAuthority } from "@/spatial/hooks/useSceneAuthority";
import CinematicCameraRig from "@/spatial/components/CinematicCameraRig";
import HomeEnvironment from "@/spatial/components/HomeEnvironment";
import LifeMapStarfield, { type LifeMapStar } from "@/spatial/components/LifeMapStarfield";
import FocusSubject from "@/spatial/components/FocusSubject";
import ReplayShell from "@/spatial/components/ReplayShell";

export default function SpatialScene() {
  const authority = useSceneAuthority();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        authority.goHome();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [authority]);


  const { phase, selectedStarId, transitionStartMs } = authority;

  useEffect(() => {
    if (phase !== "ASCENT") return;
    const t = window.setTimeout(() => authority.openLifeMap(), 1200);
    return () => window.clearTimeout(t);
  }, [phase, authority]);

  const stars = useMemo<LifeMapStar[]>(() => [
    { id: "star_alpha", position: [-3.2, 1.1, -18], size: 0.95, color: "#9bb8ff" },
    { id: "star_beta", position: [0, 2.0, -22], size: 1.15, color: "#c7d6ff" },
    { id: "star_gamma", position: [3.8, -0.4, -19], size: 0.85, color: "#7aa2ff" },
  ], []);

  const selectedStar = useMemo(() => {
    if (!selectedStarId) return null;
    return stars.find((s) => s.id === selectedStarId) ?? null;
  }, [selectedStarId, stars]);

  const selected = selectedStar?.position ?? [0, 2.0, -22];

  // CLEAN ascent progress (single source of truth)
  const ascentProgress =
    phase === "ASCENT"
      ? Math.min(1, (Date.now() - (transitionStartMs ?? Date.now())) / 1200)
      : phase === "LIFEMAP"
      ? 1
      : 0;

  const showHome = phase === "HOME" || phase === "ASCENT";
  const showLifeMap = phase === "ASCENT" || phase === "LIFEMAP" || phase === "FOCUS" || phase === "REPLAY";

  const showFocus = phase === "FOCUS" || phase === "REPLAY";
  const showReplay = phase === "REPLAY";

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Canvas>
        <hemisphereLight args={["#4f6b8a", "#020611", 0.6]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[10, 20, 10]} intensity={0.6} />

        <Suspense fallback={null}>
          <color attach="background" args={["#020611"]} />

          <CinematicCameraRig phase={phase} selected={selected} />
            <ReplayShell active={phase === "REPLAY"} />

          <HomeEnvironment ascentOffset={ascentProgress} 
            opacity={phase === "ASCENT" ? 1 - ascentProgress : 1}
            visible={showHome}
            interactive={phase === "HOME"}
            onSkySelect={() => authority.beginAscent()}
            onOrbSelect={() => authority.beginAscent()}
          />

          <LifeMapStarfield ascentOffset={ascentProgress} 
            opacity={phase === "ASCENT" ? ascentProgress : 1}
            visible={showLifeMap}
            interactive={phase === "LIFEMAP"}
            stars={stars}
            selectedStarId={selectedStarId}
            onSelectStar={(id) => authority.openFocus(id)}
          />

          <FocusSubject
            visible={showFocus}
            interactive={phase === "FOCUS"}
            position={selected}
            starId={selectedStarId}
            onEnterReplay={() => authority.openReplay(authority.selectedStarId)}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
