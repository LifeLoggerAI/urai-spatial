"use client";

import React, { useEffect, useMemo, useReducer, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { initialUraiState, uraiReducer } from "../../lib/uraiCanon/state";
import {
  CANON_CAMERA,
  FOCUS_CONVERGENCE,
  REPLAY_ENTRY,
  easeOutCubic,
  canonConvergence,
  lerp,
  lerpVec3,
} from "../../lib/uraiCanon/camera";
import type { CameraPose, StarNode, TransitionState, UraiRuntimeState } from "../../lib/uraiCanon/types";
import { useCanonEsc } from "../hooks/useCanonEsc";
import { useCanonInputLock } from "../hooks/useCanonInputLock";

const SHOW_DEBUG = process.env.NEXT_PUBLIC_URAI_DEBUG === "1";

const STARS: StarNode[] = [
  { id: "memory-01", label: "Memory 1", position: { x: -4.0, y: 1.1, z: -18 }, intensity: 0.95, emotionalTone: "awe",      clusterId: "alpha", memoryRef: "memory-01", isInteractive: true, stability: 0.9 },
  { id: "memory-02", label: "Memory 2", position: { x: -2.0, y: -0.1, z: -22 }, intensity: 0.72, emotionalTone: "warm",     clusterId: "alpha", memoryRef: "memory-02", isInteractive: true, stability: 0.8 },
  { id: "memory-03", label: "Memory 3", position: { x:  1.2, y:  0.6, z: -26 }, intensity: 0.60, emotionalTone: "neutral",  clusterId: "beta",  memoryRef: "memory-03", isInteractive: true, stability: 0.75 },
  { id: "memory-04", label: "Memory 4", position: { x:  4.2, y: -0.8, z: -24 }, intensity: 0.84, emotionalTone: "recovery", clusterId: "beta",  memoryRef: "memory-04", isInteractive: true, stability: 0.85 },
  { id: "memory-05", label: "Memory 5", position: { x:  5.8, y:  1.2, z: -31 }, intensity: 0.58, emotionalTone: "cool",     clusterId: "gamma", memoryRef: "memory-05", isInteractive: true, stability: 0.7 },
  { id: "memory-06", label: "Memory 6", position: { x: -6.2, y: -1.4, z: -29 }, intensity: 0.44, emotionalTone: "grief",    clusterId: "gamma", memoryRef: "memory-06", isInteractive: true, stability: 0.65 },
  { id: "memory-07", label: "Memory 7", position: { x:  0.0, y:  2.5, z: -36 }, intensity: 0.35, emotionalTone: "neutral",  clusterId: "delta", memoryRef: "memory-07", isInteractive: true, stability: 0.6 },
];

function transitionDurationMs(transition: TransitionState): number {
  switch (transition) {
    case "HOME_SETTLE":
      return CANON_CAMERA.home.settle.durationMs;
    case "ASCENT":
      return 2200;
    case "DESCENT":
      return 2000;
    case "FOCUS_LOCK":
      return FOCUS_CONVERGENCE.durationMs;
    case "FOCUS_RELEASE":
      return 1600;
    case "REPLAY_ENTRY":
      return REPLAY_ENTRY.durationMs;
    case "REPLAY_EXIT":
      return 1200;
    default:
      return 0;
  }
}

function easedProgress(transition: TransitionState, raw: number): number {
  const t = Math.max(0, Math.min(1, raw));
  switch (transition) {
    case "HOME_SETTLE":
      return easeOutCubic(t);
    case "ASCENT":
    case "DESCENT":
    case "FOCUS_RELEASE":
    case "REPLAY_ENTRY":
    case "REPLAY_EXIT":
      return easeOutCubic(t);
    case "FOCUS_LOCK":
      return canonConvergence(t);
    default:
      return t;
  }
}

function toneColor(tone: StarNode["emotionalTone"]): string {
  switch (tone) {
    case "warm":
      return "#b8c5e7";
    case "cool":
      return "#9db2d8";
    case "grief":
      return "#7d89a8";
    case "rupture":
      return "#9da6bf";
    case "awe":
      return "#d8e2ff";
    case "recovery":
      return "#c7d7ff";
    default:
      return "#b7c4e0";
  }
}

function starRadius(star: StarNode): number {
  return 0.18 + star.intensity * 0.32;
}

function getSelectedStar(selectedStarId: string | null): StarNode | null {
  return STARS.find((s) => s.id === selectedStarId) ?? null;
}

function focusPose(star: StarNode | null): CameraPose {
  if (!star) return { ...CANON_CAMERA.lifeMap.pose };
  return {
    position: {
      x: star.position.x * 0.08,
      y: star.position.y * 0.08,
      z: star.position.z + CANON_CAMERA.focus.finalDistanceFromStar,
    },
    target: { ...star.position },
    fov: CANON_CAMERA.fov.focus,
  };
}

function replayPose(star: StarNode | null): CameraPose {
  if (!star) return { ...CANON_CAMERA.lifeMap.pose };
  return {
    position: {
      x: star.position.x * 0.04,
      y: star.position.y * 0.04,
      z: star.position.z + 0.95,
    },
    target: { ...star.position },
    fov: CANON_CAMERA.fov.replay,
  };
}

function interpolatePose(a: CameraPose, b: CameraPose, t: number): CameraPose {
  return {
    position: lerpVec3(a.position, b.position, t),
    target: lerpVec3(a.target, b.target, t),
    fov: lerp(a.fov, b.fov, t),
  };
}

function getPose(state: UraiRuntimeState, selectedStar: StarNode | null, progress: number): CameraPose {
  const home = CANON_CAMERA.home.pose;
  const life = CANON_CAMERA.lifeMap.pose;
  const focus = focusPose(selectedStar);
  const replay = replayPose(selectedStar);

  switch (state.transition) {
    case "HOME_SETTLE":
      return home;
    case "ASCENT":
      return interpolatePose(home, life, progress);
    case "DESCENT":
      return interpolatePose(life, home, progress);
    case "FOCUS_LOCK":
      return interpolatePose(life, focus, progress);
    case "FOCUS_RELEASE":
      return interpolatePose(focus, life, progress);
    case "REPLAY_ENTRY":
      return interpolatePose(focus, replay, progress);
    case "REPLAY_EXIT":
      return interpolatePose(replay, focus, progress);
    default:
      switch (state.phase) {
        case "HOME":
          return home;
        case "LIFEMAP":
          return life;
        case "FOCUS":
          return focus;
        case "REPLAY":
          return replay;
      }
  }
}

function getWorldMix(state: UraiRuntimeState, progress: number) {
  switch (state.transition) {
    case "ASCENT":
      return { home: 1 - progress, life: progress, focus: 0, replay: 0 };
    case "DESCENT":
      return { home: progress, life: 1 - progress, focus: 0, replay: 0 };
    case "FOCUS_LOCK":
      return { home: 0, life: 1 - progress, focus: progress, replay: 0 };
    case "FOCUS_RELEASE":
      return { home: 0, life: progress, focus: 1 - progress, replay: 0 };
    case "REPLAY_ENTRY":
      return { home: 0, life: 0, focus: 1 - progress, replay: progress };
    case "REPLAY_EXIT":
      return { home: 0, life: 0, focus: progress, replay: 1 - progress };
    default:
      switch (state.phase) {
        case "HOME":
          return { home: 1, life: 0, focus: 0, replay: 0 };
        case "LIFEMAP":
          return { home: 0, life: 1, focus: 0, replay: 0 };
        case "FOCUS":
          return { home: 0, life: 0, focus: 1, replay: 0 };
        case "REPLAY":
          return { home: 0, life: 0, focus: 0, replay: 1 };
      }
  }
}

function SceneAtmosphere({
  mix,
}: {
  mix: ReturnType<typeof getWorldMix>;
}) {
  const { scene } = useThree();
  const colorRef = useRef(new THREE.Color("#020816"));
  const fogRef = useRef(new THREE.FogExp2("#020816", 0.018));

  useFrame(() => {
    const home = new THREE.Color("#031224");
    const life = new THREE.Color("#01050f");
    const focus = new THREE.Color("#111827");
    const replay = new THREE.Color("#161d2d");

    const r =
      home.r * mix.home +
      life.r * mix.life +
      focus.r * mix.focus +
      replay.r * mix.replay;
    const g =
      home.g * mix.home +
      life.g * mix.life +
      focus.g * mix.focus +
      replay.g * mix.replay;
    const b =
      home.b * mix.home +
      life.b * mix.life +
      focus.b * mix.focus +
      replay.b * mix.replay;

    colorRef.current.setRGB(r, g, b);
    fogRef.current.color.copy(colorRef.current);
    fogRef.current.density = 0.012 + mix.life * 0.01 + mix.focus * 0.012 + mix.replay * 0.018;

    scene.background = colorRef.current;
    scene.fog = fogRef.current;
  });

  return null;
}

function CameraRig({
  state,
  selectedStar,
  progress,
}: {
  state: UraiRuntimeState;
  selectedStar: StarNode | null;
  progress: number;
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const pose = getPose(state, selectedStar, progress);
    const smoothing = Math.min(1, delta * 8);

    camera.near = CANON_CAMERA.clip.near;
    camera.far = CANON_CAMERA.clip.far;
    camera.position.lerp(
      new THREE.Vector3(pose.position.x, pose.position.y, pose.position.z),
      smoothing,
    );
    targetRef.current.lerp(
      new THREE.Vector3(pose.target.x, pose.target.y, pose.target.z),
      smoothing,
    );
    camera.fov = lerp(camera.fov, pose.fov, smoothing);
    camera.lookAt(targetRef.current);
    camera.updateProjectionMatrix();
  });

  return null;
}

function HomeWorld({ opacity }: { opacity: number }) {
  if (opacity <= 0.001) return null;

  return (
    <group>
      <ambientLight intensity={0.35 * opacity} />
      <directionalLight position={[0, 6, 4]} intensity={0.75 * opacity} color="#93c5fd" />
      <pointLight position={[0, 0.6, 1.8]} intensity={2.3 * opacity} distance={10} color="#c7d2fe" />

      <mesh position={[0, -4.8, -6]} scale={[18, 8, 18]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#020b19" transparent opacity={0.92 * opacity} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.72, 64, 64]} />
        <meshStandardMaterial color="#9fb2cc" emissive="#8ea0ba" emissiveIntensity={0.12 * opacity} roughness={0.55} metalness={0.05} />
      </mesh>

      <mesh position={[0, -0.98, -2]} rotation={[-Math.PI / 2.8, 0, 0]} scale={[16, 16, 1]}>
        <circleGeometry args={[1, 96]} />
        <meshStandardMaterial color="#031120" transparent opacity={0.95 * opacity} roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

function StarField({
  opacity,
  selectedStarId,
  hoverStarId,
  onHover,
  onSelect,
  interactive,
}: {
  opacity: number;
  selectedStarId: string | null;
  hoverStarId: string | null;
  onHover: (starId: string | null) => void;
  onSelect: (star: StarNode) => void;
  interactive: boolean;
}) {
  if (opacity <= 0.001) return null;

  return (
    <group>
      <ambientLight intensity={0.22 * opacity} />
      <pointLight position={[0, 0, -8]} intensity={0.55 * opacity} color="#dbeafe" />

      {STARS.map((star) => {
        const isSelected = star.id === selectedStarId;
        const isHovered = star.id === hoverStarId;
        const base = starRadius(star);
        const scale = isSelected ? 1.4 : isHovered ? 1.16 : 1.0;

        return (
          <group key={star.id} position={[star.position.x, star.position.y, star.position.z]}>
            <mesh
              onPointerEnter={() => interactive && onHover(star.id)}
              onPointerLeave={() => interactive && onHover(null)}
              onClick={() => interactive && onSelect(star)}
            >
              <sphereGeometry args={[base * scale, 32, 32]} />
              <meshStandardMaterial
                color={toneColor(star.emotionalTone)}
                emissive={toneColor(star.emotionalTone)}
                emissiveIntensity={(0.18 + star.intensity * 0.28) * opacity}
                transparent
                opacity={0.96 * opacity}
                roughness={0.3}
                metalness={0.05}
              />
            </mesh>

            <mesh scale={[1.9, 1.9, 1.9]}>
              <sphereGeometry args={[base * 1.05, 24, 24]} />
              <meshBasicMaterial
                color={toneColor(star.emotionalTone)}
                transparent
                opacity={(0.05 + star.intensity * 0.09) * opacity}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function FocusWorld({
  opacity,
  star,
}: {
  opacity: number;
  star: StarNode | null;
}) {
  if (opacity <= 0.001 || !star) return null;

  return (
    <group>
      <ambientLight intensity={0.18 * opacity} />
      <pointLight position={[star.position.x, star.position.y, star.position.z + 3]} intensity={1.25 * opacity} color="#dbeafe" />

      <mesh position={[star.position.x, star.position.y, star.position.z]}>
        <sphereGeometry args={[0.95, 48, 48]} />
        <meshStandardMaterial
          color={toneColor(star.emotionalTone)}
          emissive={toneColor(star.emotionalTone)}
          emissiveIntensity={0.35 * opacity}
          transparent
          opacity={1}
          roughness={0.22}
          metalness={0.06}
        />
      </mesh>

      <mesh position={[star.position.x, star.position.y, star.position.z]} scale={[7.2, 7.2, 7.2]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color="#cbd5e1" transparent opacity={0.045 * opacity} depthWrite={false} />
      </mesh>

      <mesh position={[star.position.x, star.position.y, star.position.z - 0.4]} rotation={[Math.PI / 2, 0, 0]} scale={[4.8, 1.15, 1]}>
        <ringGeometry args={[0.9, 1.2, 64]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.09 * opacity} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ReplayWorld({
  opacity,
  star,
}: {
  opacity: number;
  star: StarNode | null;
}) {
  if (opacity <= 0.001 || !star) return null;

  return (
    <group>
      <ambientLight intensity={0.16 * opacity} />
      <pointLight position={[star.position.x, star.position.y + 0.8, star.position.z + 1.6]} intensity={1.1 * opacity} color="#e2e8f0" />

      <mesh position={[star.position.x, star.position.y, star.position.z]}>
        <sphereGeometry args={[0.78, 40, 40]} />
        <meshStandardMaterial
          color="#d8e2ff"
          emissive="#d8e2ff"
          emissiveIntensity={0.22 * opacity}
          roughness={0.3}
          metalness={0.05}
        />
      </mesh>

      <mesh position={[star.position.x, star.position.y - 0.85, star.position.z - 0.4]} rotation={[-0.12, 0, 0]} scale={[4.8, 1.6, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.08 * opacity} depthWrite={false} />
      </mesh>

      <mesh position={[star.position.x - 1.4, star.position.y - 0.4, star.position.z - 2.6]} rotation={[0, 0.45, 0]}>
        <boxGeometry args={[0.7, 1.8, 0.08]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.16 * opacity} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[star.position.x + 1.6, star.position.y - 0.28, star.position.z - 2.1]} rotation={[0, -0.38, 0]}>
        <boxGeometry args={[0.92, 1.35, 0.08]} />
        <meshStandardMaterial color="#475569" transparent opacity={0.14 * opacity} roughness={1} metalness={0} />
      </mesh>

      <mesh position={[star.position.x, star.position.y + 1.2, star.position.z - 1.8]} rotation={[0.4, 0, 0]}>
        <torusGeometry args={[1.45, 0.03, 12, 64]} />
        <meshBasicMaterial color="#cbd5e1" transparent opacity={0.08 * opacity} depthWrite={false} />
      </mesh>
    </group>
  );
}

function CanonScene({
  state,
  progress,
  onHover,
  onSelect,
  canSelectStar,
}: {
  state: UraiRuntimeState;
  progress: number;
  onHover: (starId: string | null) => void;
  onSelect: (star: StarNode) => void;
  canSelectStar: boolean;
}) {
  const selectedStar = getSelectedStar(state.selectedStarId);
  const mix = getWorldMix(state, progress);

  return (
    <>
      <SceneAtmosphere mix={mix} />
      <CameraRig state={state} selectedStar={selectedStar} progress={progress} />

      <HomeWorld opacity={mix.home} />
      <StarField
        opacity={Math.max(mix.life, mix.focus * 0.15)}
        selectedStarId={state.selectedStarId}
        hoverStarId={state.hoverStarId}
        onHover={onHover}
        onSelect={onSelect}
        interactive={canSelectStar}
      />
      <FocusWorld opacity={mix.focus} star={selectedStar} />
      <ReplayWorld opacity={mix.replay} star={selectedStar} />
    </>
  );
}

export default function SpatialScene(): JSX.Element {
  const [state, dispatch] = useReducer(uraiReducer, initialUraiState);
  const flags = useCanonInputLock(state);
  const selectedStar = useMemo(() => getSelectedStar(state.selectedStarId), [state.selectedStarId]);
  const transitionStartedAt = useRef<number>(Date.now());
  const transitionProgress = useRef<number>(0);

  useCanonEsc({ state, dispatch });

  useEffect(() => {
    transitionStartedAt.current = Date.now();

    if (state.transition === "IDLE") return;

    const ms = transitionDurationMs(state.transition);
    if (ms <= 0) return;

    const timer = window.setTimeout(() => {
      dispatch({ type: "TRANSITION_COMPLETE" });
    }, ms);

    return () => window.clearTimeout(timer);
  }, [state.transition]);

  useEffect(() => {
    if (state.transition === "HOME_SETTLE") {
      const timer = window.setTimeout(() => {
        dispatch({ type: "HOME_SETTLED" });
      }, transitionDurationMs("HOME_SETTLE"));
      return () => window.clearTimeout(timer);
    }
  }, [state.transition]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#01050f",
      }}
    >
      <Canvas
        camera={{
          position: [
            CANON_CAMERA.home.pose.position.x,
            CANON_CAMERA.home.pose.position.y,
            CANON_CAMERA.home.pose.position.z,
          ],
          fov: CANON_CAMERA.home.pose.fov,
          near: CANON_CAMERA.clip.near,
          far: CANON_CAMERA.clip.far,
        }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        dpr={[1, 1.75]}
        onPointerMissed={() => {
          if (flags.canClickSky) dispatch({ type: "ASCEND_TO_LIFEMAP" });
        }}
      >
        <TransitionClock state={state} progressRef={transitionProgress} />
        <CanonScene
          state={state}
          progress={transitionProgress.current}
          onHover={(starId) => dispatch({ type: "HOVER_STAR", starId })}
          onSelect={(star) => dispatch({ type: "SELECT_STAR", star })}
          canSelectStar={flags.canSelectStar}
        />
      </Canvas>

      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "16px",
          color: "#e5e7eb",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          letterSpacing: "0.08em",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            {SHOW_DEBUG ? state.phase : ""}
          </div>
          <div style={{ fontSize: 11, opacity: SHOW_DEBUG ? 0.75 : 0 }}>
            {SHOW_DEBUG ? state.transition : ""}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
          <div style={{ fontSize: 12, opacity: state.phase === "HOME" ? 0.0 : 0.88 }}>
            {(state.phase === "FOCUS" || state.phase === "REPLAY") && selectedStar
              ? `ANCHOR  ${selectedStar.label ?? selectedStar.id}`
              : ""}
          </div>

          <div style={{ display: "flex", gap: 12, pointerEvents: "auto" }}>
            {state.phase === "FOCUS" && !state.inputLocked && selectedStar ? (
              <button
                onClick={() => dispatch({ type: "ENTER_REPLAY", memoryRef: selectedStar.memoryRef })}
                style={{
                  pointerEvents: "auto",
                  background: "rgba(8,15,28,0.72)",
                  color: "#e5e7eb",
                  border: "1px solid rgba(148,163,184,0.22)",
                  borderRadius: 999,
                  padding: "12px 18px",
                  fontSize: 12,
                  letterSpacing: "0.12em",
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                }}
              >
                REPLAY
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function TransitionClock({
  state,
  progressRef,
}: {
  state: UraiRuntimeState;
  progressRef: React.MutableRefObject<number>;
}) {
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    startedAtRef.current = Date.now();
    progressRef.current = 0;
  }, [state.transition, progressRef]);

  useFrame(() => {
    if (state.transition === "IDLE") {
      progressRef.current = 1;
      return;
    }

    const duration = transitionDurationMs(state.transition);
    if (duration <= 0) {
      progressRef.current = 1;
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const raw = Math.max(0, Math.min(1, elapsed / duration));
    progressRef.current = easedProgress(state.transition, raw);
  });

  return null;
}
