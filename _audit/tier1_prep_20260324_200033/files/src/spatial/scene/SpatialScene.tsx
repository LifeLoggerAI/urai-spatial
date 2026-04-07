"use client";

import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type ScenePhase = "home" | "ascent" | "lifemap" | "focus" | "replay";
type DepthBand = "near" | "mid" | "far";

type StarPoint = {
  id: string;
  band: DepthBand;
  position: [number, number, number];
  color: string;
  size: number;
  label: string;
  chapter: string;
  summary: string;
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildStars(): StarPoint[] {
  const rng = makeRng(19830414);
  const stars: StarPoint[] = [];
  const palette = ["#f5fbff", "#dcecff", "#bfd7ff", "#ffffff", "#d6e7ff"];
  const chapters = ["Origins", "Signal", "Threshold", "Recovery", "Orbit", "Return"];

  const addBand = (
    band: DepthBand,
    count: number,
    xSpread: number,
    ySpread: number,
    zMin: number,
    zMax: number,
    sizeMin: number,
    sizeMax: number
  ) => {
    for (let i = 0; i < count; i += 1) {
      const z = lerp(zMin, zMax, rng());
      const x = (rng() - 0.5) * xSpread;
      const y = (rng() - 0.5) * ySpread + (band === "near" ? 0.15 : band === "mid" ? 0.05 : 0);
      const size = lerp(sizeMin, sizeMax, rng());
      const color = palette[Math.floor(rng() * palette.length)];
      const chapter = chapters[Math.floor(rng() * chapters.length)];
      stars.push({
        id: `${band}-${i}`,
        band,
        position: [x, y, z],
        color,
        size,
        label: `${chapter} ${i + 1}`,
        chapter,
        summary: `${chapter} memory anchor ${i + 1}`,
      });
    }
  };

  addBand("near", 44, 26, 10, -12, -42, 0.075, 0.19);
  addBand("mid", 96, 48, 20, -48, -150, 0.038, 0.11);
  addBand("far", 160, 110, 48, -170, -420, 0.015, 0.05);

  return stars;
}

function CameraRig({
  phase,
  ascent,
  selected,
}: {
  phase: ScenePhase;
  ascent: number;
  selected: StarPoint | null;
}) {
  const drift = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    const ascentEase = easeInOutCubic(ascent);

    let tx = 0;
    let ty = 0.12;
    let tz = 8.4;
    let lx = 0;
    let ly = 0.08;
    let lz = -32;
    let targetFov = 52;

    if (phase === "home") {
      tx = Math.sin(t * 0.19) * 0.16;
      ty = 0.12 + Math.sin(t * 0.23) * 0.06;
      tz = 8.4 + Math.cos(t * 0.17) * 0.08;
      lx = 0;
      ly = 0.02;
      lz = -24;
      targetFov = 52;
    } else if (phase === "ascent") {
      tx = lerp(0, 1.25, ascentEase) + Math.sin(t * 0.55) * 0.08;
      ty = lerp(0.12, 3.6, ascentEase) + Math.sin(t * 0.75) * 0.12;
      tz = lerp(8.4, -26, ascentEase);
      lx = lerp(0, 0.1, ascentEase);
      ly = lerp(0.05, 1.2, ascentEase);
      lz = lerp(-24, -180, ascentEase);
      targetFov = lerp(52, 44, ascentEase);
    } else if (phase === "lifemap") {
      tx = Math.sin(t * 0.1) * 0.25;
      ty = 0.8 + Math.sin(t * 0.14) * 0.12;
      tz = -26 + Math.cos(t * 0.08) * 0.2;
      lx = 0;
      ly = 0.2;
      lz = -160;
      targetFov = 46;
    } else if (phase === "focus" && selected) {
      tx = selected.position[0] * 0.1 + 0.8;
      ty = selected.position[1] * 0.08 + 0.35;
      tz = selected.position[2] + 7.5;
      lx = selected.position[0] * 0.22;
      ly = selected.position[1] * 0.18;
      lz = selected.position[2] - 2.8;
      targetFov = 38;
    } else if (phase === "replay" && selected) {
      tx = selected.position[0] * 0.08 + 0.15;
      ty = selected.position[1] * 0.08 + 0.1;
      tz = selected.position[2] + 4.1;
      lx = selected.position[0] * 0.12;
      ly = selected.position[1] * 0.12;
      lz = selected.position[2] - 5.5;
      targetFov = 33;
    }

    drift.current.set(tx, ty, tz);
    look.current.set(lx, ly, lz);

    camera.position.lerp(drift.current, 0.055);
    camera.lookAt(look.current);

    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = lerp(perspective.fov, targetFov, 0.08);
    perspective.updateProjectionMatrix();
  });

  return null;
}

function Horizon({ ascent }: { ascent: number }) {
  const g = useMemo(() => {
    const geom = new THREE.SphereGeometry(120, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2.15);
    geom.rotateX(-Math.PI / 2);
    return geom;
  }, []);

  return (
    <group position={[0, -6.6, -88]}>
      <mesh geometry={g}>
        <meshBasicMaterial
          color={"#050a18"}
          transparent
          opacity={lerp(0.98, 0.25, easeInOutCubic(ascent))}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 4.8, 0]}>
        <ringGeometry args={[18, 48, 96]} />
        <meshBasicMaterial
          color={"#10203d"}
          transparent
          opacity={lerp(0.22, 0.06, easeInOutCubic(ascent))}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Orb({ phase, ascent }: { phase: ScenePhase; ascent: number }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    const ease = easeInOutCubic(ascent);
    groupRef.current.position.x = Math.sin(t * 0.35) * 0.12;
    groupRef.current.position.y = lerp(-0.55, 0.45, ease) + Math.sin(t * 0.65) * 0.12;
    groupRef.current.position.z = lerp(-4.5, -16, ease);
    groupRef.current.scale.setScalar(lerp(1, 0.72, ease));
    groupRef.current.visible = phase === "home" || phase === "ascent";
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.74, 32, 32]} />
        <meshBasicMaterial color={"#dfe8f5"} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.86, 32, 32]} />
        <meshBasicMaterial color={"#7f9dc9"} transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[3.1, 32, 32]} />
        <meshBasicMaterial color={"#4b6da0"} transparent opacity={0.05} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function StarNode({
  star,
  phase,
  selected,
  hoveredId,
  setHoveredId,
  onSelect,
  ascent,
}: {
  star: StarPoint;
  phase: ScenePhase;
  selected: StarPoint | null;
  hoveredId: string | null;
  setHoveredId: (value: string | null) => void;
  onSelect: (star: StarPoint) => void;
  ascent: number;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;

    const t = clock.elapsedTime;
    const bandSpeed = star.band === "near" ? 1 : star.band === "mid" ? 0.45 : 0.12;
    const bandSway = star.band === "near" ? 0.08 : star.band === "mid" ? 0.045 : 0.018;
    const ascentEase = easeInOutCubic(ascent);
    const selectedNow = selected?.id === star.id;
    const hoveredNow = hoveredId === star.id;

    ref.current.position.x = star.position[0] + Math.sin(t * (0.12 + bandSpeed * 0.08) + star.position[2] * 0.02) * bandSway;
    ref.current.position.y = star.position[1] + Math.cos(t * (0.15 + bandSpeed * 0.06) + star.position[0] * 0.03) * bandSway;
    ref.current.position.z = star.position[2] + ascentEase * (star.band === "near" ? 44 : star.band === "mid" ? 18 : 6);

    const baseScale = star.size * (star.band === "near" ? 1.12 : star.band === "mid" ? 1 : 0.92);
    const liftScale = phase === "ascent" ? lerp(1, star.band === "near" ? 2.2 : star.band === "mid" ? 1.45 : 1.08, ascentEase) : 1;
    const activeScale = selectedNow ? 2.2 : hoveredNow ? 1.5 : 1;
    ref.current.scale.setScalar(baseScale * liftScale * activeScale);
  });

  const isSelected = selected?.id === star.id;
  const isHovered = hoveredId === star.id;
  const dimOthers = (phase === "focus" || phase === "replay") && selected && !isSelected;
  const bandOpacity =
    star.band === "near" ? 0.96 :
    star.band === "mid" ? 0.72 :
    0.44;
  const opacity = dimOthers ? 0.05 : isSelected ? 1 : isHovered ? 0.98 : bandOpacity;
  const emissive = isSelected ? "#b8d6ff" : star.color;

  return (
    <mesh
      ref={ref}
      position={star.position}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredId(star.id);
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredId((current) => (current === star.id ? null : current));
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(star);
      }}
    >
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial
        color={emissive}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function Starfield({
  phase,
  ascent,
  selected,
  setSelected,
}: {
  phase: ScenePhase;
  ascent: number;
  selected: StarPoint | null;
  setSelected: (star: StarPoint | null) => void;
}) {
  const stars = useMemo(() => buildStars(), []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <group>
      {stars.map((star) => (
        <StarNode
          key={star.id}
          star={star}
          phase={phase}
          selected={selected}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          onSelect={(item) => setSelected(item)}
          ascent={ascent}
        />
      ))}
    </group>
  );
}

function FocusHalo({ selected, phase }: { selected: StarPoint | null; phase: ScenePhase }) {
  if (!selected || (phase !== "focus" && phase !== "replay")) return null;

  const haloZ = phase === "focus" ? selected.position[2] - 2.6 : selected.position[2] - 5.4;
  const haloY = phase === "focus" ? selected.position[1] : selected.position[1] - 0.12;

  return (
    <group position={[selected.position[0], haloY, haloZ]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 2.45, 64]} />
        <meshBasicMaterial color={"#6f94c9"} transparent opacity={phase === "focus" ? 0.18 : 0.12} depthWrite={false} />
      </mesh>
      {phase === "replay" ? (
        <mesh>
          <sphereGeometry args={[2.75, 32, 32]} />
          <meshBasicMaterial color={"#0f1e38"} transparent opacity={0.1} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function Overlay({
  phase,
  selected,
  onStart,
  onExit,
  onReplay,
}: {
  phase: ScenePhase;
  selected: StarPoint | null;
  onStart: () => void;
  onExit: () => void;
  onReplay: () => void;
}) {
  return (
    <Html fullscreen>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          color: "#dfe8f5",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          background:
            phase === "replay"
              ? "radial-gradient(circle at center, rgba(15,28,56,0.18), rgba(0,0,0,0) 45%)"
              : "none",
        }}
      >
        <div style={{ position: "absolute", top: 22, left: 22, maxWidth: 420 }}>
          <div style={{ letterSpacing: "0.22em", fontSize: 13, opacity: 0.8 }}>URAI SPATIAL</div>
          <div style={{ marginTop: 8, fontSize: 34, fontWeight: 700, lineHeight: 1 }}>
            {phase === "home" ? "HOME" :
             phase === "ascent" ? "ASCENT" :
             phase === "lifemap" ? "LIFEMAP" :
             phase === "focus" ? "FOCUS" :
             "REPLAY"}
          </div>
          <div style={{ marginTop: 12, fontSize: 15, opacity: 0.92, lineHeight: 1.45 }}>
            {phase === "home" && "Enter or click empty space to begin ascent."}
            {phase === "ascent" && "Camera is moving forward through depth bands."}
            {phase === "lifemap" && "Click a star to isolate it. Esc returns home."}
            {phase === "focus" && selected && `${selected.label} — ${selected.summary}`}
            {phase === "replay" && selected && `Replay chamber anchored to ${selected.label}.`}
          </div>
          {phase === "home" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              style={{
                pointerEvents: "auto",
                marginTop: 16,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(223,232,245,0.25)",
                background: "rgba(9,18,34,0.58)",
                color: "#dfe8f5",
                cursor: "pointer",
              }}
            >
              Begin ascent
            </button>
          ) : null}
          {(phase === "lifemap" || phase === "focus" || phase === "replay") ? (
            <div style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>
              Esc = home
              {phase === "focus" ? " · Enter or R = replay" : ""}
              {phase === "replay" ? " · Enter = focus" : ""}
            </div>
          ) : null}
          {(phase === "focus" || phase === "replay") ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (phase === "focus") onReplay();
                else onExit();
              }}
              style={{
                pointerEvents: "auto",
                marginTop: 16,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(223,232,245,0.22)",
                background: "rgba(9,18,34,0.58)",
                color: "#dfe8f5",
                cursor: "pointer",
              }}
            >
              {phase === "focus" ? "Enter replay" : "Exit replay"}
            </button>
          ) : null}
        </div>
      </div>
    </Html>
  );
}

function SceneRoot() {
  const [phase, setPhase] = useState<ScenePhase>("home");
  const [selected, setSelected] = useState<StarPoint | null>(null);
  const [ascent, setAscent] = useState(0);
  const ascentStartRef = useRef<number | null>(null);

  const startAscent = () => {
    if (phase !== "home") return;
    ascentStartRef.current = performance.now();
    setSelected(null);
    setAscent(0);
    setPhase("ascent");
  };

  const exitToHome = () => {
    ascentStartRef.current = null;
    setSelected(null);
    setAscent(0);
    setPhase("home");
  };

  const enterReplay = () => {
    if (!selected) return;
    setPhase("replay");
  };

  useEffect(() => {
    if (phase !== "ascent") return;

    let raf = 0;
    const tick = () => {
      const start = ascentStartRef.current ?? performance.now();
      const t = clamp01((performance.now() - start) / 2600);
      setAscent(t);
      if (t >= 1) {
        ascentStartRef.current = null;
        setPhase("lifemap");
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        if (phase === "home") {
          startAscent();
        } else if (phase === "focus" && selected) {
          setPhase("replay");
        } else if (phase === "replay" && selected) {
          setPhase("focus");
        }
      }

      if (event.key.toLowerCase() === "r" && phase === "focus" && selected) {
        setPhase("replay");
      }

      if (event.key === "Escape") {
        if (phase === "replay" && selected) {
          setPhase("focus");
          return;
        }
        exitToHome();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, selected]);

  useEffect(() => {
    if (phase === "focus" || phase === "replay") return;
    if (!selected) return;
    setPhase("focus");
  }, [selected, phase]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#010611" }}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.12, 8.4], fov: 52, near: 0.1, far: 1200 }}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={() => {
          if (phase === "home") startAscent();
          else if (phase === "focus") setPhase("lifemap");
          else if (phase === "replay") setPhase("focus");
        }}
      >
        <color attach="background" args={["#010611"]} />
        <fog attach="fog" args={["#010611", 90, 460]} />
        <ambientLight intensity={0.35} />
        <Suspense fallback={null}>
          <CameraRig phase={phase} ascent={ascent} selected={selected} />
          <Horizon ascent={ascent} />
          <Orb phase={phase} ascent={ascent} />
          <Starfield phase={phase} ascent={ascent} selected={selected} setSelected={setSelected} />
          <FocusHalo selected={selected} phase={phase} />
          <Overlay
            phase={phase}
            selected={selected}
            onStart={startAscent}
            onExit={() => setPhase("focus")}
            onReplay={enterReplay}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default function SpatialScene() {
  return <SceneRoot />;
}
