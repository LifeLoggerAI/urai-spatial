"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type CanonPhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY" | string;

type CinematicCameraRigProps = {
  phase?: CanonPhase;
  activePhase?: CanonPhase;
  scenePhase?: CanonPhase;
  selectedStar?: { position?: [number, number, number] } | null;
  selectedStarPosition?: [number, number, number] | null;
  ascentProgress?: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const HOME_POS = new THREE.Vector3(0, 1.65, 8.8);
const HOME_TARGET = new THREE.Vector3(0, 0.68, 0);

const ASCENT_POS = new THREE.Vector3(0, 8.2, 10.8);
const ASCENT_TARGET = new THREE.Vector3(0, 8.8, -36);

const LIFEMAP_POS = new THREE.Vector3(0, 14.4, 22);
const LIFEMAP_TARGET = new THREE.Vector3(0, 15.4, -70);

function readPhase(props: CinematicCameraRigProps): CanonPhase {
  return props.phase ?? props.activePhase ?? props.scenePhase ?? "HOME";
}

function finiteVector(values: [number, number, number] | null | undefined, fallback: THREE.Vector3): THREE.Vector3 {
  if (!values || values.length !== 3) return fallback.clone();

  const [x, y, z] = values;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return fallback.clone();
  }

  return new THREE.Vector3(x, y, z);
}

function lifePathAt(progress: number) {
  const t = smooth(progress);
  const liftT = smooth(clamp01(t / 0.5));
  const settleT = smooth(clamp01((t - 0.35) / 0.65));

  const position = HOME_POS.clone().lerp(ASCENT_POS, liftT).lerp(LIFEMAP_POS, settleT);
  const target = HOME_TARGET.clone().lerp(ASCENT_TARGET, liftT).lerp(LIFEMAP_TARGET, settleT);
  const fov = THREE.MathUtils.lerp(42, 56, t);

  return { position, target, fov };
}

export default function CinematicCameraRig(props: CinematicCameraRigProps) {
  const { camera } = useThree();
  const travelRef = useRef(0);
  const replayOrbitRef = useRef(0);
  const targetRef = useRef(HOME_TARGET.clone());
  const bootedRef = useRef(false);

  useFrame((_state, rawDelta) => {
    const phase = readPhase(props);
    const delta = Math.min(Math.max(rawDelta, 0), 1 / 20);

    const travelTarget = phase === "HOME" ? 0 : 1;
    const travelLambda = phase === "ASCENT" ? 2.35 : phase === "HOME" ? 3.15 : 5.2;
    const explicitAscent = phase === "ASCENT" ? clamp01(props.ascentProgress ?? 0) : travelTarget;

    travelRef.current = THREE.MathUtils.damp(
      travelRef.current,
      phase === "ASCENT" ? Math.max(explicitAscent, 0.18) : travelTarget,
      travelLambda,
      delta,
    );

    if (phase === "HOME" && travelRef.current < 0.01) {
      travelRef.current = 0;
    }

    const base = lifePathAt(travelRef.current);
    let desiredPos = base.position;
    let desiredTarget = base.target;
    let desiredFov = phase === "HOME" ? 42 : base.fov;

    if (phase === "LIFEMAP") {
      desiredPos = LIFEMAP_POS.clone();
      desiredTarget = LIFEMAP_TARGET.clone();
      desiredFov = 56;
    }

    const selected = finiteVector(
      props.selectedStarPosition ?? props.selectedStar?.position ?? null,
      new THREE.Vector3(0, 15, -65),
    );

    if (phase === "FOCUS" || phase === "REPLAY") {
      const focusPos = new THREE.Vector3(selected.x * 0.24, selected.y + 4.2, selected.z + 23);
      desiredPos = focusPos;
      desiredTarget = selected.clone();
      desiredFov = 42;
    }

    if (phase === "REPLAY") {
      replayOrbitRef.current += delta;
      const orbit = replayOrbitRef.current;

      desiredPos = new THREE.Vector3(
        selected.x * 0.18 + Math.sin(orbit * 0.42) * 2.6,
        selected.y + 2.8 + Math.sin(orbit * 0.3) * 0.55,
        selected.z + 12 + Math.cos(orbit * 0.42) * 2.2,
      );
      desiredTarget = new THREE.Vector3(selected.x, selected.y, selected.z - 1.2);
      desiredFov = 38;
    } else {
      replayOrbitRef.current = 0;
    }

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