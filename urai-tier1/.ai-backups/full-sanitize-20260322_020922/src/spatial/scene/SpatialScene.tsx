import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useSceneStore } from "../state/sceneStore";
import HomeWorld from "./HomeWorld";
import Starfield from "./Starfield";
import ReplaySphere from "./ReplaySphere";
import CameraRig from "../components/CameraRig";

export default function SpatialScene() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const goHome = useSceneStore((s) => s.goHome);
  const exitReplay = useSceneStore((s) => s.exitReplay);
  const focusStar = useSceneStore((s) => s.focusStar);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const state = useSceneStore.getState();

      if (state.mode === "replay") {
        state.exitReplay();
        return;
      }

      if (state.mode === "focus") {
        state.focusStar(null);
        return;
      }

      state.goHome();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Canvas
        camera={{ position: [0, 1.1, 7.5], fov: 42, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.75]}
      >
        <color attach="background" args={["#02040b"]} />
        <fog attach="fog" args={["#02040b", 10, 58]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 8, 6]} intensity={1.35} color={"#8aa4ff"} />
        <pointLight position={[0, 2.2, 1.5]} intensity={2.4} color={"#dbe8ff"} distance={18} />
        <CameraRig />
        <HomeWorld />
        <Starfield />
        {mode === "replay" && selectedStarId ? <ReplaySphere starId={selectedStarId} /> : null}
      </Canvas>

      <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/72 backdrop-blur-md">
        {mode === "home" ? "Home" : mode === "sky" ? "Sky" : mode === "lifemap" ? "LifeMap" : mode === "focus" ? "Star Focus" : "Replay"}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs text-white/65 backdrop-blur-md">
        ESC returns one level back. ESC on Home hard-resets to Home.
      </div>
    </div>
  );
}
