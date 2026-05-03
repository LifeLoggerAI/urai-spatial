"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CanonPhase } from "@/lib/uraiCanon/types";

type Vec3Tuple = [number, number, number];

type CinematicCameraRigProps = {
  phase: CanonPhase | string;
  selected?: Vec3Tuple | null;
};

type Pose = {
  position: THREE.Vector3;
  target: THREE.Vector3;
};

type Snapshot = {
  phase: string;
  fromPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toPosition: THREE.Vector3;
  toTarget: THREE.Vector3;
  startedAt: number;
  durationMs: number;
};

const HOME_POS = new THREE.Vector3(0, 1.35, 10.5);
const HOME_TARGET = new THREE.Vector3(0, 1.0, -8.0);

const ASCENT_POS = new THREE.Vector3(0, 6.8, 7.2);
const ASCENT_TARGET = new THREE.Vector3(0, 2.3, -28.0);

const LIFEMAP_POS = new THREE.Vector3(0, 8.4, -16.0);
const LIFEMAP_TARGET = new THREE.Vector3(0, 2.4, -70.0);

function normalizePhase(input: string): string {
  const upper = String(input || "HOME").toUpperCase();
  if (upper === "OPEN_REPLAY") return "REPLAY";
  if (upper === "CLOSE_REPLAY") return "FOCUS";
  return upper;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smootherstep(t: number): number {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function poseForPhase(phaseRaw: string, selected?: Vec3Tuple | null): Pose {
  const phase = normalizePhase(phaseRaw);
  const star = selected
    ? new THREE.Vector3(selected[0], selected[1], selected[2])
    : new THREE.Vector3(0, 2.2, -54);

  if (phase === "HOME") {
    return {
      position: HOME_POS.clone(),
      target: HOME_TARGET.clone(),
    };
  }

  if (phase === "ASCENT") {
    return {
      position: ASCENT_POS.clone(),
      target: ASCENT_TARGET.clone(),
    };
  }

  if (phase === "LIFEMAP") {
    return {
      position: LIFEMAP_POS.clone(),
      target: LIFEMAP_TARGET.clone(),
    };
  }

  if (phase === "FOCUS") {
    const focusTarget = star.clone();
    const focusPos = star.clone().add(new THREE.Vector3(0, 1.05, 8.2));
    return {
      position: focusPos,
      target: focusTarget,
    };
  }

  if (phase === "REPLAY") {
    const replayTarget = star.clone().add(new THREE.Vector3(0, 0.55, -4.8));
    const replayPos = star.clone().add(new THREE.Vector3(0, 1.55, 3.8));
    return {
      position: replayPos,
      target: replayTarget,
    };
  }

  return {
    position: HOME_POS.clone(),
    target: HOME_TARGET.clone(),
  };
}

function durationForTransition(fromPhaseRaw: string, toPhaseRaw: string): number {
  const fromPhase = normalizePhase(fromPhaseRaw);
  const toPhase = normalizePhase(toPhaseRaw);

  if (fromPhase === toPhase) return 0;
  if (fromPhase === "HOME" && toPhase === "ASCENT") return 1800;
  if (fromPhase === "ASCENT" && toPhase === "LIFEMAP") return 1500;
  if (fromPhase === "LIFEMAP" && toPhase === "FOCUS") return 950;
  if (fromPhase === "FOCUS" && toPhase === "REPLAY") return 1250;
  if (fromPhase === "REPLAY" && toPhase === "FOCUS") return 1100;
  if (fromPhase === "FOCUS" && toPhase === "LIFEMAP") return 900;
  if (fromPhase === "LIFEMAP" && toPhase === "HOME") return 1400;
  return 1000;
}

export function CinematicCameraRig({
  phase,
  selected = null,
  
  
  
}: CinematicCameraRigProps) {
  const { camera } = useThree();

  const currentPhaseRef = useRef<string>(normalizePhase(String(phase)));
  const currentTargetRef = useRef<THREE.Vector3>(HOME_TARGET.clone());
  const transitionRef = useRef<Snapshot | null>(null);
  const tmpDirRef = useRef(new THREE.Vector3());
  const tmpLookRef = useRef(new THREE.Vector3());
  const seededRef = useRef(false);

  const seedPose = useMemo(() => poseForPhase(normalizePhase(String(phase)), selected), []);

  useEffect(() => {
    if (seededRef.current) return;
    camera.position.copy(seedPose.position);
    currentTargetRef.current.copy(seedPose.target);
    camera.lookAt(seedPose.target);
    seededRef.current = true;
  }, [camera, seedPose]);

  useEffect(() => {
    const nextPhase = normalizePhase(String(phase));
    const prevPhase = currentPhaseRef.current;

    const fromPosition = camera.position.clone();
    const fromTarget = currentTargetRef.current.clone();
    const nextPose = poseForPhase(nextPhase, selected);
    let toPosition = nextPose.position.clone();
    let toTarget = nextPose.target.clone();

    if (prevPhase === "ASCENT" && nextPhase === "LIFEMAP") {
      const forward = fromTarget.clone().sub(fromPosition).normalize();

      const travelDistance = Math.max(18, fromPosition.distanceTo(toPosition));
      toPosition = fromPosition.clone().add(forward.clone().multiplyScalar(travelDistance));

      toTarget = fromPosition.clone().add(forward.clone().multiplyScalar(80));

      if (toPosition.z > fromPosition.z) {
        toPosition.z = fromPosition.z - 12;
      }

      if (toTarget.z > toPosition.z) {
        toTarget.z = toPosition.z - 40;
      }
    }

    if (prevPhase === "LIFEMAP" && nextPhase === "FOCUS") {
      const lifeForward = fromTarget.clone().sub(fromPosition).normalize();
      const desiredTravel = toPosition.clone().sub(fromPosition);
      if (desiredTravel.dot(lifeForward) < 0) {
        const projected = Math.max(6, Math.abs(desiredTravel.dot(lifeForward)) + 8);
        toPosition = fromPosition.clone().add(lifeForward.clone().multiplyScalar(projected));
      }
    }

    if (prevPhase === "REPLAY" && nextPhase === "FOCUS") {
      const replayForward = fromTarget.clone().sub(fromPosition).normalize();
      const desiredTravel = toPosition.clone().sub(fromPosition);
      if (desiredTravel.dot(replayForward) > 0) {
        toPosition = fromPosition.clone().add(replayForward.clone().multiplyScalar(-6));
      }
    }

    transitionRef.current = {
      phase: nextPhase,
      fromPosition,
      fromTarget,
      toPosition,
      toTarget,
      startedAt: performance.now(),
      durationMs: durationForTransition(prevPhase, nextPhase),
    };

    currentPhaseRef.current = nextPhase;
  }, [camera, phase, selected]);

  useFrame(() => {
    const tr = transitionRef.current;
    if (!tr) {
      camera.lookAt(currentTargetRef.current);
      return;
    }

    if (tr.durationMs <= 0) {
      camera.position.copy(tr.toPosition);
      currentTargetRef.current.copy(tr.toTarget);
      camera.lookAt(currentTargetRef.current);
      transitionRef.current = null;
      return;
    }

    const elapsed = performance.now() - tr.startedAt;
    const t = smootherstep(elapsed / tr.durationMs);

    camera.position.lerpVectors(tr.fromPosition, tr.toPosition, t);
    currentTargetRef.current.lerpVectors(tr.fromTarget, tr.toTarget, t);

    tmpDirRef.current.copy(currentTargetRef.current).sub(camera.position).normalize();

    if (normalizePhase(tr.phase) === "LIFEMAP") {
      tmpLookRef.current.copy(tr.toTarget).sub(camera.position).normalize();
      const dot = tmpDirRef.current.dot(tmpLookRef.current);
      if (dot < 0.15) {
        currentTargetRef.current.copy(camera.position).add(tmpDirRef.current.multiplyScalar(72));
      }
    }

    camera.lookAt(currentTargetRef.current);

    if (elapsed >= tr.durationMs) {
      camera.position.copy(tr.toPosition);
      currentTargetRef.current.copy(tr.toTarget);
      camera.lookAt(currentTargetRef.current);
      transitionRef.current = null;
    }
  });

  return null;
}

export default CinematicCameraRig;
