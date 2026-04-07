"use client";

import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Phase = "home" | "ascent" | "lifemap" | "focus" | "replay";

type FeaturedStar = {
  id: string;
  title: string;
  position: [number, number, number];
  color: string;
  size: number;
};

function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function v3Lerp(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  return new THREE.Vector3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
}

function smoothstep01(x: number) {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

function buildFeaturedStars(): FeaturedStar[] {
  return [
    { id: "s-01", title: "Origin", position: [-10, 8, -35], color: "#b9d4ff", size: 0.42 },
    { id: "s-02", title: "Threshold", position: [-6, 10, -42], color: "#d8e7ff", size: 0.34 },
    { id: "s-03", title: "Council", position: [-2, 7, -30], color: "#9fc2ff", size: 0.40 },
    { id: "s-04", title: "Archive", position: [4, 9, -38], color: "#c7ddff", size: 0.32 },
    { id: "s-05", title: "Companion", position: [10, 8, -44], color: "#b8d0ff", size: 0.44 },
    { id: "s-06", title: "Bloom", position: [-12, 3, -26], color: "#dde9ff", size: 0.28 },
    { id: "s-07", title: "Recovery", position: [-4, 4, -24], color: "#b6ceff", size: 0.30 },
    { id: "s-08", title: "Replay", position: [3, 5, -22], color: "#d5e3ff", size: 0.30 },
    { id: "s-09", title: "Forecast", position: [11, 4, -28], color: "#aac6ff", size: 0.34 },
    { id: "s-10", title: "Mirror", position: [-9, -1, -18], color: "#c0d8ff", size: 0.26 },
    { id: "s-11", title: "LifeMap", position: [0, 0, -16], color: "#e2edff", size: 0.28 },
    { id: "s-12", title: "Rebirth", position: [9, -1, -20], color: "#b5ccff", size: 0.30 },
  ];
}

function buildBackgroundStars(count: number) {
  const rand = createRng(19830414);
  const out: Array<{ position: [number, number, number]; scale: number }> = [];
  for (let i = 0; i < count; i += 1) {
    const x = (rand() - 0.5) * 130;
    const y = rand() * 44 - 9;
    const z = -10 - rand() * 170;
    const scale = 0.02 + rand() * 0.08;
    out.push({ position: [x, y, z], scale });
  }
  return out;
}

function CameraRig({
  phase,
  ascentT,
  selected,
}: {
  phase: Phase;
  ascentT: number;
  selected: FeaturedStar | null;
}) {
  useFrame((state) => {
    const t = phase === "ascent" ? smoothstep01(ascentT) : 1;
    const camera = state.camera;
    const targetPos = new THREE.Vector3();
    const targetLook = new THREE.Vector3();

    if (phase === "home") {
      targetPos.set(0, 1.8, 9.5);
      targetLook.set(0, 1.35, 0);
    } else if (phase === "ascent") {
      const a = new THREE.Vector3(0, 1.8, 9.5);
      const b = new THREE.Vector3(0, 8.5, 1.5);
      const la = new THREE.Vector3(0, 1.35, 0);
      const lb = new THREE.Vector3(0, 6.5, -30);
      targetPos.copy(v3Lerp(a, b, t));
      targetLook.copy(v3Lerp(la, lb, t));
    } else if (phase === "lifemap") {
      targetPos.set(0, 7.5, 5.5);
      targetLook.set(0, 5, -35);
    } else if (phase === "focus" && selected) {
      targetPos.set(selected.position[0] * 0.18, selected.position[1] * 0.18 + 0.2, 3.1);
      targetLook.set(selected.position[0], selected.position[1], selected.position[2]);
    } else if (phase === "replay" && selected) {
      const time = state.clock.getElapsedTime();
      targetPos.set(
        selected.position[0] * 0.12 + Math.sin(time * 0.45) * 0.7,
        selected.position[1] * 0.12 + 0.35 + Math.cos(time * 0.35) * 0.25,
        2.2 + Math.cos(time * 0.4) * 0.35
      );
      targetLook.set(selected.position[0], selected.position[1], selected.position[2]);
    } else {
      targetPos.set(0, 7.5, 5.5);
      targetLook.set(0, 5, -35);
    }

    camera.position.lerp(targetPos, 0.08);
    camera.lookAt(targetLook);
  });

  return null;
}

function World({
  phase,
  ascentT,
  selected,
  onBeginAscent,
  onSelectStar,
}: {
  phase: Phase;
  ascentT: number;
  selected: FeaturedStar | null;
  onBeginAscent: () => void;
  onSelectStar: (star: FeaturedStar) => void;
}) {
  const featured = useMemo(() => buildFeaturedStars(), []);
  const backgroundStars = useMemo(() => buildBackgroundStars(240), []);
  const orbRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const homeFade = phase === "home" ? 1 : phase === "ascent" ? 1 - smoothstep01(ascentT) : 0;
  const lifemapFade = phase === "home" ? 0.18 : phase === "ascent" ? smoothstep01(ascentT) : 1;
  const replayDarken = phase === "replay" ? 1 : 0;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (orbRef.current) {
      orbRef.current.position.y = 1.45 + Math.sin(t * 0.9) * 0.05;
    }
    if (haloRef.current) {
      haloRef.current.rotation.z += 0.0015;
    }
  });

  return (
    <>
      <color attach="background" args={[phase === "replay" ? "#010102" : "#020611"]} />
      <fog attach="fog" args={[phase === "replay" ? "#010102" : "#020611", 18, 180]} />

      <ambientLight intensity={phase === "replay" ? 0.18 : 0.42} />
      <directionalLight position={[0, 14, 6]} intensity={0.65} color={"#bcd0ff"} />
      <pointLight position={[0, 1.7, 0]} intensity={homeFade * 3.2} color={"#9fc2ff"} />
      <pointLight position={[0, 6, -34]} intensity={lifemapFade * 2.4} color={"#bcd4ff"} />

      <mesh
        position={[0, 14, -110]}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          if (phase === "home") onBeginAscent();
        }}
      >
        <planeGeometry args={[320, 200]} />
        <meshBasicMaterial color={"#031129"} />
      </mesh>

      <mesh position={[0, -1.8, -16]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color={"#020202"} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, -0.82, -14]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[260, 50]} />
        <meshBasicMaterial color={"#010204"} transparent opacity={0.95} />
      </mesh>

      <mesh position={[0, 0.55, -26]}>
        <planeGeometry args={[260, 30]} />
        <meshBasicMaterial color={"#06152c"} transparent opacity={0.35 + lifemapFade * 0.12} />
      </mesh>

      <group visible={homeFade > 0.001}>
        <mesh ref={haloRef} position={[0, 0.18, -1.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.2, 3.6, 96]} />
          <meshBasicMaterial color={"#16345f"} transparent opacity={0.28 * homeFade} />
        </mesh>

        <mesh position={[0, 0.02, -1.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.7, 64]} />
          <meshBasicMaterial color={"#0a1e3f"} transparent opacity={0.48 * homeFade} />
        </mesh>

        <mesh ref={orbRef} position={[0, 1.45, -1.8]}>
          <sphereGeometry args={[0.19, 32, 32]} />
          <meshStandardMaterial
            color={"#dce8ff"}
            emissive={"#9ab8ff"}
            emissiveIntensity={2.4 * homeFade}
            roughness={0.12}
            metalness={0.15}
            transparent
            opacity={homeFade}
          />
        </mesh>
      </group>

      {backgroundStars.map((star, i) => (
        <mesh key={`bg-${i}`} position={star.position}>
          <sphereGeometry args={[star.scale, 8, 8]} />
          <meshBasicMaterial
            color={"#d8e6ff"}
            transparent
            opacity={(phase === "home" ? 0.85 : 0.45 + lifemapFade * 0.3) * (1 - replayDarken * 0.45)}
          />
        </mesh>
      ))}

      {featured.map((star) => {
        const isSelected = selected?.id === star.id;
        const dim =
          phase === "focus" || phase === "replay"
            ? isSelected
              ? 1
              : 0.08
            : 1;

        return (
          <group key={star.id} position={star.position}>
            <mesh
              onPointerDown={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                if (phase === "lifemap") onSelectStar(star);
              }}
            >
              <sphereGeometry args={[star.size * (isSelected ? 1.3 : 1), 18, 18]} />
              <meshStandardMaterial
                color={star.color}
                emissive={star.color}
                emissiveIntensity={(isSelected ? 2.8 : 1.7) * dim}
                roughness={0.15}
                metalness={0.05}
                transparent
                opacity={dim}
              />
            </mesh>

            <mesh>
              <sphereGeometry args={[star.size * 2.25, 12, 12]} />
              <meshBasicMaterial
                color={star.color}
                transparent
                opacity={(isSelected ? 0.14 : 0.06) * dim}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

export default function SpatialScene() {
  const [phase, setPhase] = useState<Phase>("home");
  const [phaseStartedAt, setPhaseStartedAt] = useState<number>(Date.now());
  const [selected, setSelected] = useState<FeaturedStar | null>(null);

  const ascentT = phase === "ascent" ? Math.min(1, (Date.now() - phaseStartedAt) / 1400) : 0;

  useEffect(() => {
    if (phase !== "ascent") return;
    const timer = window.setTimeout(() => {
      setPhase("lifemap");
      setPhaseStartedAt(Date.now());
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (phase === "replay") {
        setPhase("focus");
        setPhaseStartedAt(Date.now());
        return;
      }

      if (phase === "focus") {
        setPhase("lifemap");
        setPhaseStartedAt(Date.now());
        return;
      }

      if (phase === "lifemap" || phase === "ascent") {
        setSelected(null);
        setPhase("home");
        setPhaseStartedAt(Date.now());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase]);

  const beginAscent = () => {
    if (phase !== "home") return;
    setSelected(null);
    setPhase("ascent");
    setPhaseStartedAt(Date.now());
  };

  const goHome = () => {
    setSelected(null);
    setPhase("home");
    setPhaseStartedAt(Date.now());
  };

  const goLifeMap = () => {
    setPhase("lifemap");
    setPhaseStartedAt(Date.now());
  };

  const goFocus = () => {
    if (!selected) return;
    setPhase("focus");
    setPhaseStartedAt(Date.now());
  };

  const goReplay = () => {
    if (!selected) return;
    setPhase("replay");
    setPhaseStartedAt(Date.now());
  };

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", background: "#000" }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.8, 9.5], fov: 48, near: 0.1, far: 400 }}
        gl={{ antialias: true }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <CameraRig phase={phase} ascentT={ascentT} selected={selected} />
        <World
          phase={phase}
          ascentT={ascentT}
          selected={selected}
          onBeginAscent={beginAscent}
          onSelectStar={(star) => {
            setSelected(star);
            setPhase("focus");
            setPhaseStartedAt(Date.now());
          }}
        />
      </Canvas>

      <div
        style={{
          position: "fixed",
          left: 16,
          bottom: 16,
          zIndex: 20,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          maxWidth: "calc(100vw - 32px)",
        }}
      >
        <button onClick={goHome}>Home</button>
        <button onClick={beginAscent}>Begin ascent</button>
        <button onClick={goLifeMap}>LifeMap</button>
        <button onClick={goFocus} disabled={!selected}>Focus</button>
        <button onClick={goReplay} disabled={!selected}>Replay</button>
      </div>

      <div
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 20,
          color: "#dbe7ff",
          fontFamily: "Arial, sans-serif",
          fontSize: 12,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          opacity: 0.9,
          userSelect: "none",
        }}
      >
        {phase === "home" && "Home — click sky or Begin ascent"}
        {phase === "ascent" && "Ascent — transitioning to LifeMap"}
        {phase === "lifemap" && "LifeMap — click a star to enter Focus"}
        {phase === "focus" && `Focus — ${selected?.title ?? "Star"} — Esc returns to LifeMap`}
        {phase === "replay" && `Replay — ${selected?.title ?? "Star"} — Esc returns to Focus`}
      </div>
    </div>
  );
}
