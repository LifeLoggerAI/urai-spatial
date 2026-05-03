"use client";
/* URAI_CANON_SPATIAL_SCENE_V1 */
import { Canvas } from "@react-three/fiber";
import { useMemo } from "react";
import type { CanonPhase, StarPoint } from "@/lib/uraiCanon/types";
import { useCanonEsc } from "@/spatial/hooks/useCanonEsc";
import { useSceneAuthority } from "@/spatial/hooks/useSceneAuthority";
import { CinematicCameraRig } from "@/spatial/components/CinematicCameraRig";
import { HomeEnvironment } from "@/spatial/components/HomeEnvironment";
import { LifeMapStarfield } from "@/spatial/components/LifeMapStarfield";
import { FocusSubject } from "@/spatial/components/FocusSubject";
import { ReplayScene } from "@/spatial/components/ReplayScene";

function buildStars(): StarPoint[] {
return [
{ id: "star-1", position: [-9, 2.6, -36], color: "#dce8ff", scale: 0.32, label: "Threshold" },
{ id: "star-2", position: [-4.2, -1.4, -42], color: "#b9d2ff", scale: 0.28, label: "Signal" },
{ id: "star-3", position: [3.1, 2.2, -48], color: "#dce8ff", scale: 0.28, label: "Mirror" },
{ id: "star-4", position: [8.8, -2.2, -54], color: "#8cb1ff", scale: 0.24, label: "Council" },
{ id: "star-5", position: [-11.6, -3.1, -62], color: "#dce8ff", scale: 0.24, label: "Memory" },
{ id: "star-6", position: [-1.2, 3.4, -66], color: "#b9d2ff", scale: 0.22, label: "Replay" },
{ id: "star-7", position: [9.2, 1.4, -72], color: "#dce8ff", scale: 0.22, label: "Companion" },
{ id: "star-8", position: [0.2, -3.4, -78], color: "#8cb1ff", scale: 0.2, label: "Archive" },
{ id: "star-9", position: [-7.1, 1.1, -84], color: "#dce8ff", scale: 0.2, label: "Anchor" },
];
}

function phaseAtmosphere(phase: CanonPhase): { background: string; fogNear: number; fogFar: number } {
if (phase === "HOME") return { background: "#010817", fogNear: 18, fogFar: 84 };
if (phase === "ASCENT") return { background: "#020a1d", fogNear: 16, fogFar: 110 };
if (phase === "LIFEMAP") return { background: "#010611", fogNear: 24, fogFar: 180 };
if (phase === "FOCUS") return { background: "#020817", fogNear: 12, fogFar: 70 };
return { background: "#02050d", fogNear: 8, fogFar: 50 };
}

export function SpatialScene() {
const authority = useSceneAuthority();
const stars = useMemo(() => buildStars(), []);
const selectedStar = stars.find((star) => star.id === authority.selectedStarId) ?? null;
const phase = authority.phase;
const atmosphere = phaseAtmosphere(phase);

useCanonEsc(() => authority.escape());

const showHome = phase === "HOME" || phase === "ASCENT";
const showLifeMap = phase !== "HOME";
const showFocus = phase === "FOCUS" || phase === "REPLAY";
const showReplay = phase === "REPLAY";

return (
<div style={{ position: "fixed", inset: 0, width: "100%", height: "100vh", background: atmosphere.background }}>
<Canvas
gl={{ antialias: true, alpha: false }}
dpr={[1, 2]}
camera={{ position: [0, 1.6, 18], fov: 46, near: 0.1, far: 500 }}
> <color attach="background" args={[atmosphere.background]} />
<fog attach="fog" args={[atmosphere.background, atmosphere.fogNear, atmosphere.fogFar]} />

```
    <ambientLight intensity={0.42} color="#99b6ff" />
    <directionalLight position={[4, 8, 10]} intensity={0.55} color="#d6e5ff" />
    <pointLight position={[0, 1.5, 12]} intensity={1.25} distance={40} color="#9bb6ff" />

    <CinematicCameraRig phase={phase} selected={selectedStar?.position ?? null} />

    <HomeEnvironment
      visible={showHome}
      interactive={phase === "HOME"}
      onSkySelect={authority.beginAscent}
      onOrbSelect={authority.beginAscent}
      onGroundSelect={phase === "LIFEMAP" ? authority.goHome : undefined}
      phase={phase}
      dim={phase === "ASCENT" ? 0.15 : 0}
    />

    <LifeMapStarfield
      visible={showLifeMap}
      stars={stars}
      selectedStarId={authority.selectedStarId}
      onSelectStar={authority.openFocus}
      focusSuppression={phase === "FOCUS" || phase === "REPLAY" ? 0.35 : 0}
    />

    <FocusSubject
      visible={showFocus}
      interactive={phase === "FOCUS"}
      starId={authority.selectedStarId}
      position={selectedStar?.position ?? null}
      opacity={phase === "REPLAY" ? 0.45 : 1}
      onEnterReplay={() => authority.openReplay(authority.selectedStarId)}
    />

    <ReplayScene
      visible={showReplay}
      opacity={1}
      starId={authority.selectedStarId}
      position={selectedStar?.position ?? null}
      onExit={authority.closeReplay}
    />
  </Canvas>
</div>
```

);
}

export default SpatialScene;
