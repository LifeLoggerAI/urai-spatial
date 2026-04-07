"use client";
import type { ScenePhase } from "../types/scene";

import { Canvas } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Color } from "three";
import Orb from "./Orb";
import Starfield from "./Starfield";
import FocusShellOverlay from "./FocusShellOverlay";
import ReplayOverlay from "./ReplayOverlay";

type StarPoint = {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
  title: string;
  chapter?: string;
  summary?: string;
};

const STAR_POINTS: StarPoint[] = [
  {
    id: "s1",
    position: [-2.8, 1.2, -18],
    color: "#7fb3ff",
    size: 0.2,
    title: "Origin Point",
    chapter: "Foundation",
    summary: "Initial memory anchor.",
  },
  {
    id: "s2",
    position: [0.4, 2.4, -24],
    color: "#b7d0ff",
    size: 0.26,
    title: "Signal Rise",
    chapter: "Acceleration",
    summary: "Momentum begins to compound.",
  },
  {
    id: "s3",
    position: [3.1, 0.9, -22],
    color: "#8ea8ff",
    size: 0.23,
    title: "System Lock",
    chapter: "Structure",
    summary: "Architecture stabilizes into form.",
  },
  {
    id: "s4",
    position: [-0.8, -0.1, -16],
    color: "#d7e4ff",
    size: 0.18,
    title: "Replay Core",
    chapter: "Reflection",
    summary: "Narrative playback anchor.",
  },
];

function SceneWorld({
  phase,
  selected,
  onSelect,
}: {
  phase: ScenePhase;
  selected: StarPoint | null;
  onSelect: (star: StarPoint) => void;
}): JSX.Element {
  const background = useMemo(() => new Color("#01040d"), []);
  const selectedId = selected?.id ?? null;

  return (
    <>
      <color attach="background" args={[background]} />

      <ambientLight intensity={phase === "home" ? 0.42 : 0.22} />
      <directionalLight position={[2, 4, 3]} intensity={phase === "home" ? 1.15 : 0.55} color="#9db7ff" />
      <pointLight position={[0, 0.5, 1.5]} intensity={phase === "home" ? 1.4 : 0.6} color="#88aaff" />

      <Suspense fallback={null}>
        <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.18}>
          <Orb
            visible={true}
            position={[0, 0.15, 1.2]}
            intensity={phase === "home" ? 1.28 : phase === "focus" ? 0.72 : phase === "replay" ? 0.9 : 0.38}
            orbScale={phase === "home" ? 1 : phase === "focus" ? 1.08 : phase === "replay" ? 1.38 : 0.58}
            opacity={phase === "home" ? 1 : phase === "focus" ? 0.92 : phase === "replay" ? 1 : 0.72}
          />
        </Float>

        <mesh
          position={[0, phase === "home" ? -0.55 : -0.22, phase === "home" ? -0.5 : -7.8]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[1.3, phase === "home" ? 6.8 : 10.5, 72]} />
          <meshBasicMaterial color="#2d56a8" transparent opacity={phase === "home" ? 0.05 : 0.04} />
        </mesh>

        <mesh
          position={[0, phase === "home" ? -1.18 : -4.8, phase === "home" ? -12 : -28]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={phase === "home"}
        >
          <planeGeometry args={[80, 80, 1, 1]} />
          <meshStandardMaterial color="#08111f" transparent opacity={0.92} />
        </mesh>

        <Stars
          radius={120}
          depth={80}
          count={1600}
          factor={3.4}
          saturation={0}
          fade
          speed={phase === "replay" ? 0.2 : 0.08}
        />

        <Starfield
          visible={true}
          presence={1}
          interactive={phase === "lifemap"}
          selectedId={selectedId}
          phase={phase}
          onSelectStar={(star) => {
            const matched = STAR_POINTS.find((point) => point.id === star.id);
            if (matched) onSelect(matched);
          }}
        />
      </Suspense>
    </>
  );
}

export default function SpatialScene(): JSX.Element {
  const [phase, setPhase] = useState<ScenePhase>("home");
  const [selected, setSelected] = useState<StarPoint | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Enter") {
        setPhase((current) => (current === "home" ? "lifemap" : "home"));
        if (phase === "home") setSelected(null);
      }

      if (event.key === "Escape") {
        if (phase === "replay") {
          setPhase("focus");
          return;
        }
        if (phase === "focus") {
          setPhase("lifemap");
          return;
        }
        if (phase === "lifemap") {
          setPhase("home");
          setSelected(null);
        }
      }

      if (event.key.toLowerCase() === "r" && selected) {
        setPhase("replay");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, selected]);

  const handleSelect = (star: StarPoint): void => {
    setSelected(star);
    setPhase("focus");
  };

  return (
    <div className="h-screen w-screen bg-black">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [0, 0.35, 8.6], fov: 46, near: 0.1, far: 240 }}
      >
        <SceneWorld phase={phase} selected={selected} onSelect={handleSelect} />
      </Canvas>

      {phase === "focus" && selected ? <FocusShellOverlay selected={selected} /> : null}
      {phase === "replay" && selected ? <ReplayOverlay selected={selected} /> : null}
    </div>
  );
}
