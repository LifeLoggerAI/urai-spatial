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

const LIFE_POS = new THREE.Vector3(0, 12.4, -52.0);
const LIFE_TARGET = new THREE.Vector3(0, 20.0, -255.0);
const LIFE_FOV = 50;

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

    const selected = props.selectedStarPosition ?? props.selectedStar?.position ?? [0, 20, -255];

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

    /* URAI_FULL_TIER_VIDEO_CAMERA_LOCK_V4:start */
    {
      const uraiPhase = String(phase);
      const uraiDt = (typeof dt === "number" ? dt : 1 / 60);
      const uraiUserData = camera.userData as Record<string, unknown>;

      if (uraiUserData.uraiVideoLockPhase !== uraiPhase) {
        uraiUserData.uraiVideoLockPhase = uraiPhase;
        uraiUserData.uraiVideoLockElapsed = 0;
      } else {
        uraiUserData.uraiVideoLockElapsed =
          typeof uraiUserData.uraiVideoLockElapsed === "number"
            ? uraiUserData.uraiVideoLockElapsed + uraiDt
            : uraiDt;
      }

      const uraiElapsed =
        typeof uraiUserData.uraiVideoLockElapsed === "number"
          ? uraiUserData.uraiVideoLockElapsed
          : 0;

      const uraiClamp01 = (value: number) => Math.max(0, Math.min(1, value));
      const uraiEase = (value: number) => {
        const t = uraiClamp01(value);
        return t * t * (3 - 2 * t);
      };

      if (uraiPhase !== "HOME") {
        const ascentT = uraiEase(uraiElapsed / 2.85);

        const homeExitPos = new THREE.Vector3(0, 5.8, 12.5);
        const lifeMapEntryPos = new THREE.Vector3(0, 22.5, -74);
        const ascentPos = homeExitPos.clone().lerp(lifeMapEntryPos, ascentT);

        const homeExitTarget = new THREE.Vector3(0, 3.8, -14);
        const lifeMapEntryTarget = new THREE.Vector3(0, 21.5, -158);
        const ascentTarget = homeExitTarget.clone().lerp(lifeMapEntryTarget, ascentT);

        let uraiPos = ascentPos;
        let uraiTarget = ascentTarget;

        if (uraiPhase === "LIFEMAP") {
          uraiPos = new THREE.Vector3(0, 22.5, -74);
          uraiTarget = new THREE.Vector3(0, 21.5, -158);
        } else if (uraiPhase === "FOCUS") {
          uraiPos = new THREE.Vector3(0, 19.0, -94);
          uraiTarget = new THREE.Vector3(0, 18.2, -160);
        } else if (uraiPhase === "REPLAY") {
          uraiPos = new THREE.Vector3(0, 17.2, -114);
          uraiTarget = new THREE.Vector3(0, 16.6, -174);
        }

        const uraiLambda =
          uraiPhase === "ASCENT" ? 2.25 :
          uraiPhase === "LIFEMAP" ? 5.4 :
          4.45;

        const uraiStep = uraiClamp01(1 - Math.exp(-uraiDt * uraiLambda));

        camera.position.lerp(uraiPos, uraiStep);
        targetRef.current.lerp(uraiTarget, uraiStep);

        camera.near = 0.03;
        camera.far = 2000;
        camera.updateProjectionMatrix();
        camera.lookAt(targetRef.current);
      }
    }
    /* URAI_FULL_TIER_VIDEO_CAMERA_LOCK_V4:end */
});

  return null;
}

export { CinematicCameraRig };
