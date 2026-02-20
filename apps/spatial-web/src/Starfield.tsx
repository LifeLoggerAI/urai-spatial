
'use client';

import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Star } from "./lib/lifemap/useLifeMapData";

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

interface StarfieldProps {
  memories: Star[];
}

export default function Starfield({ memories }: StarfieldProps) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!);

  const starData = useMemo(() => {
    return memories.map((memory) => {
      const position = memory.position || { x: 0, y: 0, z: 0 };
      const intensity = memory.intensity || 0.5;
      const color = new THREE.Color();
      // Simple color mapping based on type for variety
      switch (memory.type) {
        case "joy":
          color.set("#FFFF00");
          break;
        case "sadness":
          color.set("#0000FF");
          break;
        case "anger":
          color.set("#FF0000");
          break;
        default:
          color.set("#FFFFFF");
      }

      return {
        position: new THREE.Vector3(position.x, position.y, position.z),
        scale: intensity * 0.1 + 0.05,
        color,
      };
    });
  }, [memories]);

  useEffect(() => {
    if (instancedMeshRef.current) {
      starData.forEach((data, i) => {
        tempObject.position.copy(data.position);
        tempObject.scale.set(data.scale, data.scale, data.scale);
        tempObject.updateMatrix();
        instancedMeshRef.current.setMatrixAt(i, tempObject.matrix);
        if (instancedMeshRef.current.instanceColor) {
          instancedMeshRef.current.setColorAt(i, data.color);
        }
      });
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      if (instancedMeshRef.current.instanceColor) {
        instancedMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [starData]);

  useFrame((state) => {
    if (instancedMeshRef.current) {
      instancedMeshRef.current.rotation.y = state.clock.getElapsedTime() * 0.01;
    }
  });

  if (memories.length === 0) {
    return null; // Handled in parent component
  }

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, memories.length]}
      castShadow={false}
      receiveShadow={false}
    >
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  );
}
