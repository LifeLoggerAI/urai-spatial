"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useSceneStore } from "../state/sceneStore";

const HOME_POS = new Vector3(0, 1.15, 14.5);
const HOME_LOOK = new Vector3(0, 0.35, 0);

const MAP_POS = new Vector3(0, 2.8, 20.5);
const MAP_LOOK = new Vector3(0, 0, 0);

function smooth(delta: number, speed: number) {
  return 1 - Math.exp(-delta * speed);
}

export default function CameraRig() {
  const camera = useThree((state) => state.camera);

  const mode = useSceneStore((state) => state.mode);
  const selectedStar = useSceneStore((state) => state.selectedStar);
  const replayEnteredAt = useSceneStore((state) => state.replayEnteredAt);

  const posRef = useRef(new Vector3());
  const lookRef = useRef(new Vector3());

  const selectedTarget = useMemo(() => {
    if (!selectedStar) return new Vector3(0, 0, 0);
    return new Vector3(
      selectedStar.position[0],
      selectedStar.position[1],
      selectedStar.position[2]
    );
  }, [selectedStar]);

  useEffect(() => {
    camera.position.copy(HOME_POS);
    camera.lookAt(HOME_LOOK);
    posRef.current.copy(HOME_POS);
    lookRef.current.copy(HOME_LOOK);
  }, [camera]);

  useFrame((state, delta) => {
    let desiredPos = HOME_POS.clone();
    let desiredLook = HOME_LOOK.clone();

    if (mode === "lifemap") {
      desiredPos = MAP_POS.clone();
      desiredLook = MAP_LOOK.clone();
    }

    if ((mode === "focus" || mode === "replay") && selectedStar) {
      const focusLift = 1.24 + selectedStar.size * 0.12;
      const focusDistance = 6.0 + Math.min(selectedStar.size * 0.32, 1.3);

      desiredLook = selectedTarget.clone();
      desiredPos = selectedTarget.clone().add(new Vector3(1.1, focusLift, focusDistance));
    }

    if (mode === "replay" && selectedStar) {
      const enteredAt = replayEnteredAt ?? Date.now();
      const replayT = Math.max(0, (Date.now() - enteredAt) / 1000);

      const settle = Math.min(replayT / 1.4, 1);
      const orbitAngle = replayT * 0.58;
      const baseRadius = 5.8 + Math.min(selectedStar.size * 0.38, 1.35);
      const radius = baseRadius - settle * 0.4;

      const x = Math.cos(orbitAngle) * radius;
      const z = Math.sin(orbitAngle) * radius;
      const y =
        0.95 +
        Math.sin(replayT * 0.7) * 0.22 +
        Math.cos(replayT * 0.23) * 0.08;

      desiredLook = selectedTarget.clone().add(
        new Vector3(
          Math.sin(replayT * 0.21) * 0.1,
          0.02 + Math.cos(replayT * 0.33) * 0.04,
          0
        )
      );

      desiredPos = selectedTarget.clone().add(new Vector3(x, y, z));
    }

    const positionSpeed =
      mode === "replay" ? 2.2 : mode === "focus" ? 3.2 : 2.6;
    const lookSpeed =
      mode === "replay" ? 3.1 : mode === "focus" ? 4.2 : 3.0;

    posRef.current.lerp(desiredPos, smooth(delta, positionSpeed));
    lookRef.current.lerp(desiredLook, smooth(delta, lookSpeed));

    camera.position.copy(posRef.current);
    camera.lookAt(lookRef.current);
  });

  return null;
}
