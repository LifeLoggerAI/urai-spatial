"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { useSceneStore } from "../state/sceneStore";

type Vec3 = [number, number, number];

interface CameraPose {
  position: Vec3;
  target: Vec3;
  fov: number;
}

function resolveSelectedStarPosition(
  selectedStar: string | null,
  store: any,
): Vec3 | null {
  if (!selectedStar) return null;

  const pools = [
    store.stars,
    store.starfield,
    store.starNodes,
    store.starCatalog,
    store.memoryStars,
  ];

  for (const pool of pools) {
    if (!Array.isArray(pool)) continue;
    const found = pool.find((item: any) =>
      typeof item === "string" ? item === selectedStar : item?.id === selectedStar
    );
    if (found && typeof found !== "string" && Array.isArray(found.position) && found.position.length >= 3) {
      return [found.position[0], found.position[1], found.position[2]];
    }
  }

  return null;
}

function poseForMode(mode: string, selectedStarPosition: Vec3 | null): CameraPose {
  switch (mode) {
    case "lifemap":
      return {
        position: [0.65, 0.18, 9.4],
        target: [0, -0.1, -11.6],
        fov: 46,
      };
    case "focus": {
      const target = selectedStarPosition ?? [0, 0, -10];
      return {
        position: [target[0] + 0.75, target[1] + 0.25, target[2] + 3.2],
        target,
        fov: 34,
      };
    }
    case "replay":
      return {
        position: [0.25, 0.05, 3.15],
        target: [0, 0, 0],
        fov: 36,
      };
    case "ground":
      return {
        position: [0.25, 1.6, 4.9],
        target: [0, 0.78, -1.55],
        fov: 46,
      };
    case "object":
      return {
        position: [0.45, 1.85, 2.25],
        target: [0, 1.1, -1.2],
        fov: 38,
      };
    case "home":
    default:
      return {
        position: [1.35, 1.04, 6.15],
        target: [-0.55, 0.48, -0.15],
        fov: 44,
      };
  }
}

export default function CameraRig(): null {
  const { camera } = useThree();
  const mode = useSceneStore((s: any) => s.mode);
  const selectedStar = useSceneStore((s: any) => s.selectedStar);
  const fullStore = useSceneStore((s: any) => s);

  const selectedStarPosition = useMemo<Vec3 | null>(
    () => resolveSelectedStarPosition(selectedStar, fullStore),
    [selectedStar, fullStore]
  );

  const targetRef = useRef(new Vector3(0, 0, 0));
  const offsetRef = useRef(new Vector3(0, 0, 0));

  useFrame(({ clock }) => {
    const pose = poseForMode(mode, selectedStarPosition);
    const wobble = mode === "home" || mode === "ground" || mode === "lifemap" ? 0.08 : 0.02;
    const t = clock.elapsedTime;

    offsetRef.current.set(
      Math.sin(t * 0.22) * wobble,
      Math.cos(t * 0.17) * wobble * 0.55,
      Math.sin(t * 0.11) * wobble * 0.7
    );

    const desiredPosition = new Vector3(...pose.position).add(offsetRef.current);
    const desiredTarget = new Vector3(...pose.target);

    camera.position.lerp(desiredPosition, 0.08);
    targetRef.current.lerp(desiredTarget, 0.1);
    camera.lookAt(targetRef.current);

    if (camera instanceof PerspectiveCamera) {
      camera.fov = MathUtils.lerp(camera.fov, pose.fov, 0.08);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
