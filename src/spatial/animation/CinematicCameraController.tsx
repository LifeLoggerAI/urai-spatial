"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { createCameraPath, type CameraPath } from "./cameraPaths";

type CameraEventDetail = {
  cameraPath?: Parameters<typeof createCameraPath>[0];
};

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function frameAt(path: CameraPath, t: number) {
  const frames = path.keyframes;
  if (!frames.length) return null;

  let start = frames[0];
  let end = frames[frames.length - 1];

  for (let index = 0; index < frames.length - 1; index += 1) {
    if (t >= frames[index].t && t <= frames[index + 1].t) {
      start = frames[index];
      end = frames[index + 1];
      break;
    }
  }

  const span = Math.max(0.0001, end.t - start.t);
  const localT = easeInOut(Math.min(1, Math.max(0, (t - start.t) / span)));

  return {
    position: new Vector3(
      lerp(start.position[0], end.position[0], localT),
      lerp(start.position[1], end.position[1], localT),
      lerp(start.position[2], end.position[2], localT)
    ),
    lookAt: new Vector3(
      lerp(start.lookAt[0], end.lookAt[0], localT),
      lerp(start.lookAt[1], end.lookAt[1], localT),
      lerp(start.lookAt[2], end.lookAt[2], localT)
    ),
    fov:
      typeof start.fov === "number" && typeof end.fov === "number"
        ? lerp(start.fov, end.fov, localT)
        : undefined,
  };
}

export default function CinematicCameraController() {
  const { camera } = useThree();
  const [activePath, setActivePath] = useState<CameraPath | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<CameraEventDetail>).detail;
      if (!detail?.cameraPath) return;

      const path = createCameraPath(detail.cameraPath);
      if (path.kind === "none") return;

      startedAt.current = performance.now();
      setActivePath(path);
    };

    window.addEventListener("urai:camera", handler);
    return () => window.removeEventListener("urai:camera", handler);
  }, []);

  useFrame(() => {
    if (!activePath) return;

    const elapsed = performance.now() - startedAt.current;
    const progress = Math.min(1, elapsed / Math.max(1, activePath.durationMs));
    const nextFrame = frameAt(activePath, progress);

    if (!nextFrame) return;

    camera.position.copy(nextFrame.position);
    camera.lookAt(nextFrame.lookAt);

    if (typeof nextFrame.fov === "number" && "fov" in camera) {
      camera.fov = nextFrame.fov;
      camera.updateProjectionMatrix();
    }

    if (progress >= 1) {
      setActivePath(null);
    }
  });

  return null;
}
