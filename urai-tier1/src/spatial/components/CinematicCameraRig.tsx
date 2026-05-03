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
  focusProgress?: number;
  replayProgress?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

const HOME_POS = new THREE.Vector3(0, 1.65, 8.8);
const HOME_TARGET = new THREE.Vector3(0, 0.68, 0);

const CLEAR_POS = new THREE.Vector3(0, 9.15, 2.55);
const CLEAR_TARGET = new THREE.Vector3(0, -3.0, -15.0);

const SKY_POS = new THREE.Vector3(0, 11.5, -13.5);
const SKY_TARGET = new THREE.Vector3(0, 6.8, -145.0);

const LIFE_POS = new THREE.Vector3(0, 14.8, -6.5);
const LIFE_TARGET = new THREE.Vector3(0, 14.2, -64.0);
const LIFE_FOV = 56;

function readPhase(props: CinematicCameraRigProps): CanonPhase {
  return props.phase ?? props.activePhase ?? props.scenePhase ?? "HOME";
}

function pathAt(raw: number) {
  const p = smooth(clamp01(raw));

  /*
    URAI_LIFEMAP_SCREENSPACE_HERO_PROOF_LOCK

    This is a proof pass:
    - ASCENT gets clean dust only.
    - LIFEMAP lands on a known visible hero-star plane.
    - The camera is intentionally close enough that targets are obvious.
    - After click proof works, cinematic depth can be reintroduced safely.
  */
  const clearT = smooth(clamp01(p / 0.34));
  const skyT = smooth(clamp01((p - 0.22) / 0.34));
  const lifeT = smooth(clamp01((p - 0.56) / 0.32));

  const pos = HOME_POS.clone()
    .lerp(CLEAR_POS, clearT)
    .lerp(SKY_POS, skyT)
    .lerp(LIFE_POS, lifeT);

  const target = HOME_TARGET.clone()
    .lerp(CLEAR_TARGET, clearT)
    .lerp(SKY_TARGET, skyT)
    .lerp(LIFE_TARGET, lifeT);

  const fov = THREE.MathUtils.lerp(42, LIFE_FOV, p);
  return { pos, target, fov };
}

export default function CinematicCameraRig(props: CinematicCameraRigProps) {
  const { camera } = useThree();

  const travelRef = useRef(0);
  const focusRef = useRef(0);
  const replayRef = useRef(0);
  const targetRef = useRef(HOME_TARGET.clone());
  const bootedRef = useRef(false);

  useFrame((_state, dt) => {
    const phase = readPhase(props);

    if (phase === "HOME") {
      travelRef.current = Math.max(0, travelRef.current - dt / 1.0);
    } else if (phase === "ASCENT") {
      const ascentTarget = clamp01((props.ascentProgress ?? 0) * 0.92 + 0.12);
      travelRef.current = Math.max(travelRef.current, ascentTarget);
      travelRef.current = Math.min(1, travelRef.current + dt / 1.08);
    } else {
      travelRef.current = 1;
    }

    if (phase === "HOME" && travelRef.current < 0.012) {
      travelRef.current = 0;
    }

    const focusTarget = phase === "FOCUS" || phase === "REPLAY" ? 1 : 0;
    const replayTarget = phase === "REPLAY" ? 1 : 0;

    focusRef.current = THREE.MathUtils.damp(focusRef.current, focusTarget, 7.0, dt);
    replayRef.current = THREE.MathUtils.damp(replayRef.current, replayTarget, 7.0, dt);

    const base = pathAt(travelRef.current);

    let desiredPos = base.pos.clone();
    let desiredTarget = base.target.clone();
    let desiredFov = phase === "HOME" ? 42 : base.fov;

    if (phase === "LIFEMAP") {
      desiredPos = LIFE_POS.clone();
      desiredTarget = LIFE_TARGET.clone();
      desiredFov = LIFE_FOV;
    }

    const selected = props.selectedStarPosition ?? props.selectedStar?.position ?? [0, 14, -62];

    if (focusRef.current > 0.001) {
      const fp = smooth(clamp01(focusRef.current));
      desiredPos.lerp(new THREE.Vector3(selected[0] * 0.18, selected[1] + 2.5, selected[2] + 34), fp);
      desiredTarget.lerp(new THREE.Vector3(selected[0], selected[1], selected[2]), fp);
      desiredFov = THREE.MathUtils.lerp(desiredFov, 38, fp);
    }

    if (replayRef.current > 0.001) {
      const rp = smooth(clamp01(replayRef.current));
      desiredPos.lerp(new THREE.Vector3(selected[0] * 0.12, selected[1] + 1.6, selected[2] + 10), rp);
      desiredTarget.lerp(new THREE.Vector3(selected[0], selected[1], selected[2] - 2), rp);
      desiredFov = THREE.MathUtils.lerp(desiredFov, 36, rp);
    }

    if (!bootedRef.current) {
      camera.position.copy(desiredPos);
      targetRef.current.copy(desiredTarget);
      (camera as THREE.PerspectiveCamera).fov = desiredFov;
      camera.updateProjectionMatrix();
      bootedRef.current = true;
    }

    if (phase === "LIFEMAP" && focusRef.current < 0.001 && replayRef.current < 0.001) {
      camera.position.copy(LIFE_POS);
      targetRef.current.copy(LIFE_TARGET);
      (camera as THREE.PerspectiveCamera).fov = LIFE_FOV;
      camera.updateProjectionMatrix();
      camera.lookAt(targetRef.current);
      return;
    }

    const lambda =
      phase === "ASCENT" ? 8.8 :
      phase === "FOCUS" || phase === "REPLAY" ? 7.0 :
      7.5;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredPos.x, lambda, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredPos.y, lambda, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredPos.z, lambda, dt);

    targetRef.current.x = THREE.MathUtils.damp(targetRef.current.x, desiredTarget.x, lambda, dt);
    targetRef.current.y = THREE.MathUtils.damp(targetRef.current.y, desiredTarget.y, lambda, dt);
    targetRef.current.z = THREE.MathUtils.damp(targetRef.current.z, desiredTarget.z, lambda, dt);

    (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.damp(
      (camera as THREE.PerspectiveCamera).fov,
      desiredFov,
      5.8,
      dt
    );

    camera.updateProjectionMatrix();
    camera.lookAt(targetRef.current);
    return;

      });

  return null;
}
