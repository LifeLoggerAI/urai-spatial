"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useSpatialStore } from "../state/spatialStore";
import { memoryDataset } from "../memory/memoryDataset";

const CAMERA_GLIDE_SPEED = 0.05;
const TARGET_THRESHOLD = 0.1;

export default function NavigationController() {
  const { camera } = useThree();
  const {
    selectedStarId,
    interactionLock,
    setInteractionLock,
    setCameraTarget,
    cameraTarget,
  } = useSpatialStore();

  useEffect(() => {
    if (selectedStarId) {
      const star = memoryDataset.find((m) => m.id === selectedStarId);
      if (star) {
        const targetPosition = new Vector3(...star.position);
        setCameraTarget(targetPosition);
        setInteractionLock(true);
      }
    } else {
      // Return to exploration view
      setCameraTarget(new Vector3(0, 0, 50));
      setInteractionLock(true);
    }
  }, [selectedStarId, setCameraTarget, setInteractionLock]);

  useEffect(() => {
    const frameId = requestAnimationFrame(animate);

    function animate() {
      if (cameraTarget) {
        const distance = camera.position.distanceTo(cameraTarget);

        if (distance > TARGET_THRESHOLD) {
          camera.position.lerp(cameraTarget, CAMERA_GLIDE_SPEED);
        } else if (interactionLock) {
          setInteractionLock(false);
        }
      }
      requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [camera, cameraTarget, interactionLock, setInteractionLock]);

  return null;
}