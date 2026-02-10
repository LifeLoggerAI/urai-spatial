
"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Memory } from "./lib/types";

const NarrativeCamera = ({ memories }: { memories: Memory[] }) => {
  const { camera } = useThree();
  const [target, setTarget] = useState<THREE.Vector3 | null>(null);

  // Calculate a weighted average of memory properties
  const narrativeSignals = useMemo(() => {
    if (!memories || memories.length === 0) {
      return {
        resonance: 0,
        gravity: 0,
        silenceWeight: 0,
        orbitBias: "drift",
        lightTemperature: "neutral",
      };
    }

    // Simple average for now; can be refined
    const total = memories.length;
    const resonance = memories.reduce((sum, m) => sum + (m.resonance || 0), 0) / total;
    const gravity = memories.reduce((sum, m) => sum + (m.gravity || 0), 0) / total;
    const silenceWeight = memories.reduce((sum, m) => sum + (m.silenceWeight || 0), 0) / total;

    // For orbitBias and lightTemperature, we can use the most prominent one
    // or a more complex logic. Here we just take the first one's for simplicity.
    const orbitBias = memories[0]?.orbitBias || "drift";
    const lightTemperature = memories[0]?.lightTemperature || "neutral";

    return { resonance, gravity, silenceWeight, orbitBias, lightTemperature };
  }, [memories]);

  useEffect(() => {
    // Initial camera position
    camera.position.set(0, 1.6, 5);
    camera.lookAt(0, 1, 0);
  }, [camera]);

  useFrame((state, delta) => {
    const { resonance, gravity, orbitBias, silenceWeight } = narrativeSignals;

    // 1. Resonance -> Slows camera motion
    const speedFactor = 1.0 - (resonance * 0.75); // 0.25 to 1.0
    const lerpAlpha = Math.min(delta * 0.5 * speedFactor, 1.0);

    let targetPosition = new THREE.Vector3(0, 1.6, 5);

    if (target) {
      // 2. Gravity -> Pulls camera toward the memory
      const direction = target.clone().sub(camera.position).normalize();
      const gravityFactor = gravity * 0.1;
      camera.position.add(direction.multiplyScalar(gravityFactor * delta));

      // 3. orbitBias -> Adjusts distance over time
      let distance = camera.position.distanceTo(target);
      if (orbitBias === "inward") {
        distance = Math.max(distance - delta * 0.1, 1.5);
      } else if (orbitBias === "outward") {
        distance = Math.min(distance + delta * 0.1, 10.0);
      }
      targetPosition = target.clone().add(new THREE.Vector3(0, 0, distance));
    }

    // 4. silenceWeight -> Suppresses motion noise
    // This can be used to dampen random movements or "noise" in camera motion
    const noiseFactor = 1.0 - silenceWeight;
    // Example of adding some noise that gets dampened by silenceWeight
    camera.position.x += (Math.sin(state.clock.elapsedTime * 0.2) * 0.01) * noiseFactor;

    // Smoothly move camera towards its target position
    camera.position.lerp(targetPosition, lerpAlpha);

    // Always look at the center of the scene for now
    const lookAtPoint = new THREE.Vector3(0, 1, 0);
    camera.lookAt(lookAtPoint);
  });

  // In a real scenario, you would have a way to select a target memory
  // For now, we can just select the first memory as a target for demonstration
  useEffect(() => {
    if (memories && memories.length > 0) {
      const firstMemory = memories[0];
      if(firstMemory.transform) {
        setTarget(new THREE.Vector3(
          firstMemory.transform.position.x,
          firstMemory.transform.position.y,
          firstMemory.transform.position.z
        ));
      }
    }
  }, [memories]);

  return null;
};

export default NarrativeCamera;
