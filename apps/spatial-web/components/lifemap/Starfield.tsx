"use client";
import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Star } from "../../lib/lifemap/useLifeMapData";

// --- PHASE 1: RENDER CORE HARDENING ---
const TEST_STAR_COUNT = parseInt(process.env.NEXT_PUBLIC_TEST_COUNT || "0", 10);

interface StarfieldProps {
  stars: Star[];
}

// Memoize THREE objects that don't change to prevent re-creation.
const baseGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const material = new THREE.MeshBasicMaterial({ toneMapped: false }); // `vertexColors` is handled by instanceColor attribute
const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();
const capacity = 100000; // Set high capacity for 100k stars.

export default function Starfield({ stars }: StarfieldProps) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!);
  
  // Memoize the color buffer to avoid re-allocation on re-renders.
  const colorBuffer = useMemo(() => new Float32Array(capacity * 3), []);

  const starCount = stars.length;

  // This effect updates the instance data (position, color) when the stars array changes.
  // This adheres to Phase 1 by not rebuilding arrays per frame and moving data to the GPU efficiently.
  useEffect(() => {
    if (!instancedMeshRef.current) return;

    let visibleStarCount = 0;
    for (let i = 0; i < starCount; i++) {
      const star = stars[i];

      // --- PHASE 5: FAILURE SAFETY ---
      if (!star || !star.position) {
        tempMatrix.makeScale(0, 0, 0); // Hide the instance if data is invalid
      } else {
        visibleStarCount++;
        // Set position from star data.
        tempMatrix.setPosition(star.position.x, star.position.y, star.position.z);
      }
      instancedMeshRef.current.setMatrixAt(i, tempMatrix);

      // --- PHASE 2: FIRESTORE SCHEMA LOCK ---
      const intensity = star?.intensity ?? 0.5;
      tempColor.setHSL(0.6, 0.9, intensity * 0.5 + 0.2);
      tempColor.toArray(colorBuffer, i * 3);
    }
    
    // Clear remaining instances from previous renders to prevent ghosting.
    for (let i = starCount; i < instancedMeshRef.current.instanceCount; i++) {
        tempMatrix.makeScale(0, 0, 0);
        instancedMeshRef.current.setMatrixAt(i, tempMatrix);
    }

    // --- PHASE 1: Move star data into InstancedBufferGeometry ---
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    if (instancedMeshRef.current.instanceColor) {
      instancedMeshRef.current.instanceColor.needsUpdate = true;
    }

    instancedMeshRef.current.count = visibleStarCount;

  }, [stars, starCount, colorBuffer]);

  // Per Phase 5, render nothing if there are no stars.
  if (starCount === 0 && TEST_STAR_COUNT === 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[baseGeometry, material, capacity]}
      castShadow={false}
      receiveShadow={false}
      frustumCulled={false}
    >
        <instancedBufferAttribute
            attach="instanceColor"
            args={[colorBuffer, 3]}
        />
    </instancedMesh>
  );
}
