"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useState, useEffect } from "react";
import * as THREE from "three";
import { Memory } from "./lib/types";

// Step 4: Interaction without Explanation
const InteractionManager = ({ memories, onHover, onProximity, onDwell }) => {
  const { camera } = useThree();
  const [hovered, setHovered] = useState(null);
  const [dwelling, setDwelling] = useState({ id: null, startTime: 0 });

  useFrame(() => {
    const hoverThreshold = 0.2;
    const proximityThreshold = 2.0;
    const dwellThreshold = 3.0; // 3 seconds

    let closestMemory = null;
    let minDistance = Infinity;

    // Find the closest memory to the camera
    memories.forEach(memory => {
      const memoryPosition = new THREE.Vector3(
        memory.transform.position.x,
        memory.transform.position.y,
        memory.transform.position.z
      );
      const distance = camera.position.distanceTo(memoryPosition);

      if (distance < minDistance) {
        minDistance = distance;
        closestMemory = memory;
      }
    });

    // 1. Proximity: Increased orbital attention
    if (closestMemory && minDistance < proximityThreshold) {
      onProximity(closestMemory.id);
    } else {
      onProximity(null);
    }

    // 2. Hover: Very slight scale or glow shift
    if (closestMemory && minDistance < hoverThreshold) {
      if (hovered !== closestMemory.id) {
        setHovered(closestMemory.id);
        onHover(closestMemory.id);
      }
    } else {
      if (hovered !== null) {
        setHovered(null);
        onHover(null);
      }
    }

    // 3. Dwell time: Camera commits more strongly
    if (hovered && hovered === closestMemory.id) {
      if (dwelling.id !== hovered) {
        setDwelling({ id: hovered, startTime: Date.now() });
      } else {
        const dwellDuration = (Date.now() - dwelling.startTime) / 1000;
        if (dwellDuration > dwellThreshold) {
          onDwell(hovered);
        }
      }
    } else {
      if (dwelling.id !== null) {
        setDwelling({ id: null, startTime: 0 });
      }
    }
  });

  return null;
};

export default InteractionManager;
