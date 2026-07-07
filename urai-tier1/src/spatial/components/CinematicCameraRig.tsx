"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type CanonPhase = "HOME" | "ASCENT" | "GROUND" | "LIFEMAP" | "FOCUS" | "REPLAY" | "PASSPORT" | "STATUS" | string;

type EmotionalCameraSync = {
  breathSeconds?: number;
  glowStrength?: number;
  restraint?: number;
  warmth?: number;
  tiltDegrees?: number;
};

type CinematicCameraRigProps = {
  phase?: CanonPhase;
  activePhase?: CanonPhase;
  scenePhase?: CanonPhase;
  selectedStar?: { position?: [number, number, number] } | null;
  selectedStarPosition?: [number, number, number] | null;
  ascentProgress?: number;
  emotionalSync?: EmotionalCameraSync | null;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const HOME_POS = new THREE.Vector3(0, 1.65, 8.8);
const HOME_TARGET = new THREE.Vector3(0, 0.68, 0);
const ASCENT_POS = new THREE.Vector3(0, 3.6, 9.2);
const ASCENT_TARGET = new THREE.Vector3(0, 2.25, -11.5);
const GROUND_POS = new THREE.Vector3(0, -2.15, 8.6);
const GROUND_TARGET = new THREE.Vector3(0, -2.55, -4.6);
const LIFEMAP_POS = new THREE.Vector3(0, 5.4, 9.2);
const LIFEMAP_TARGET = new THREE.Vector3(0, 9.2, -8.5);
const PASSPORT_POS = new THREE.Vector3(-2.8, 1.9, 8.2);
const PASSPORT_TARGET = new THREE.Vector3(-1.15, 1.05, -2.2);
const STATUS_POS = new THREE.Vector3(2.9, 2.0, 8.2);
const STATUS_TARGET = new THREE.Vector3(1.25, 1.05, -2.2);
const LIFEMAP_FOV = 52;

function readPhase(props: CinematicCameraRigProps): CanonPhase {
  return props.phase ?? props.activePhase ?? props.scenePhase ?? "HOME";
}

function finiteVector(values: [number, number, number] | null | undefined, fallback: THREE.Vector3): THREE.Vector3 {
  if (!values || values.length !== 3) return fallback.clone();
  const [x, y, z] = values;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return fallback.clone();
  return new THREE.Vector3(x, y, z);
}

function lifePathAt(progress: number) {
  const t = smooth(progress);
  const liftT = smooth(clamp01(t / 0.5));
  const settleT = smooth(clamp01((t - 0.35) / 0.65));
  const position = HOME_POS.clone().lerp(ASCENT_POS, liftT).lerp(LIFEMAP_POS, settleT);
  const target = HOME_TARGET.clone().lerp(ASCENT_TARGET, liftT).lerp(LIFEMAP_TARGET, settleT);
  const fov = THREE.MathUtils.lerp(42, LIFEMAP_FOV, t);
  return { position, target, fov };
}

function phasePose(phase: CanonPhase) {
  if (phase === "GROUND") return { position: GROUND_POS.clone(), target: GROUND_TARGET.clone(), fov: 46 };
  if (phase === "PASSPORT") return { position: PASSPORT_POS.clone(), target: PASSPORT_TARGET.clone(), fov: 43 };
  if (phase === "STATUS") return { position: STATUS_POS.clone(), target: STATUS_TARGET.clone(), fov: 44 };
  if (phase === "LIFEMAP") return { position: LIFEMAP_POS.clone(), target: LIFEMAP_TARGET.clone(), fov: LIFEMAP_FOV };
  return null;
}

function applyEmotionalDrift(pos: THREE.Vector3, target: THREE.Vector3, sync: EmotionalCameraSync | null | undefined, phase: CanonPhase, elapsed: number) {
  if (!sync || phase === "HOME") return;
  const breathSeconds = Math.max(4.2, Math.min(9, sync.breathSeconds ?? 6));
  const glow = clamp01(sync.glowStrength ?? 0.35);
  const restraint = clamp01(sync.restraint ?? 0.7);
  const warmth = clamp01(sync.warmth ?? 0.5);
  const breath = Math.sin((elapsed / breathSeconds) * Math.PI * 2);
  const slow = Math.sin((elapsed / (breathSeconds * 1.7)) * Math.PI * 2);
  const amplitude = 0.018 + glow * 0.035 - restraint * 0.012;
  pos.x += slow * amplitude * (0.45 + warmth * 0.25);
  pos.y += breath * amplitude * 0.42;
  target.x += slow * amplitude * 0.16;
  target.y += breath * amplitude * 0.1;
}

export default function CinematicCameraRig(props: CinematicCameraRigProps) {
  const { camera } = useThree();
  const travelRef = useRef(0);
  const replayOrbitRef = useRef(0);
  const targetRef = useRef(HOME_TARGET.clone());
  const bootedRef = useRef(false);

  useFrame((state, rawDelta) => {
    const phase = readPhase(props);
    const delta = Math.min(Math.max(rawDelta, 0), 1 / 20);
    const travelTarget = phase === "HOME" ? 0 : 1;
    const travelLambda = phase === "ASCENT" ? 2.35 : phase === "HOME" ? 3.15 : 5.2;
    const explicitAscent = phase === "ASCENT" ? clamp01(props.ascentProgress ?? 0) : travelTarget;

    travelRef.current = THREE.MathUtils.damp(travelRef.current, phase === "ASCENT" ? Math.max(explicitAscent, 0.18) : travelTarget, travelLambda, delta);
    if (phase === "HOME" && travelRef.current < 0.01) travelRef.current = 0;

    const base = lifePathAt(travelRef.current);
    let desiredPos = base.position;
    let desiredTarget = base.target;
    let desiredFov = phase === "HOME" ? 42 : base.fov;

    const mappedPose = phasePose(phase);
    if (mappedPose) {
      desiredPos = mappedPose.position;
      desiredTarget = mappedPose.target;
      desiredFov = mappedPose.fov;
    }

    const selected = finiteVector(props.selectedStarPosition ?? props.selectedStar?.position ?? null, new THREE.Vector3(0, 4.4, -8));
    if (phase === "FOCUS" || phase === "REPLAY") {
      desiredPos = new THREE.Vector3(selected.x * 0.18, selected.y + 1.45, selected.z + 8.5);
      desiredTarget = selected.clone();
      desiredFov = 42;
    }
    if (phase === "REPLAY") {
      replayOrbitRef.current += delta;
      const orbit = replayOrbitRef.current;
      desiredPos = new THREE.Vector3(selected.x * 0.14 + Math.sin(orbit * 0.42) * 1.4, selected.y + 1.25 + Math.sin(orbit * 0.3) * 0.3, selected.z + 7 + Math.cos(orbit * 0.42) * 1.25);
      desiredTarget = new THREE.Vector3(selected.x, selected.y, selected.z - 0.8);
      desiredFov = 40;
    } else {
      replayOrbitRef.current = 0;
    }

    applyEmotionalDrift(desiredPos, desiredTarget, props.emotionalSync, phase, state.clock.elapsedTime);

    if (!bootedRef.current) {
      camera.position.copy(desiredPos);
      targetRef.current.copy(desiredTarget);
      const perspective = camera as THREE.PerspectiveCamera;
      perspective.fov = desiredFov;
      perspective.near = 0.05;
      perspective.far = 1200;
      perspective.updateProjectionMatrix();
      camera.lookAt(targetRef.current);
      bootedRef.current = true;
      return;
    }

    const lambda = phase === "ASCENT" ? 4.8 : phase === "FOCUS" || phase === "REPLAY" ? 5.7 : 6.2;
    const step = clamp01(1 - Math.exp(-delta * lambda));
    camera.position.lerp(desiredPos, step);
    targetRef.current.lerp(desiredTarget, step);
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = THREE.MathUtils.damp(perspective.fov, desiredFov, 5.4, delta);
    perspective.near = 0.05;
    perspective.far = 1200;
    perspective.updateProjectionMatrix();
    camera.lookAt(targetRef.current);
  });

  return null;
}

export { CinematicCameraRig };
