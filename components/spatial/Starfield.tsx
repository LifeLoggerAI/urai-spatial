'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStorytime } from './StorytimeManager';
import { SharedMemoryArchetype } from '@/lib/storytime';

const STAR_COUNT = 1200;
const STAR_FIELD_RADIUS = 100;

// Mock keywords for generating diverse archetypes
const mockKeywords = ['home', 'loss', 'discovery', 'joy', 'fear', 'celebration', 'solitude', 'connection', 'journey'];

export function StarField() {
  const { startStorytime } = useStorytime();
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!);

  // For each star, create not just a position but a unique memory archetype
  const starData = useMemo(() => {
    const data: { position: THREE.Vector3; archetype: SharedMemoryArchetype }[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * STAR_FIELD_RADIUS * 2,
        (Math.random() - 0.5) * STAR_FIELD_RADIUS * 2,
        (Math.random() - 0.5) * STAR_FIELD_RADIUS * 2
      );
      
      // Create a random, unique archetype for this star
      const archetype: SharedMemoryArchetype = {
        valence: Math.random() * 2 - 1, // -1 to 1
        magnitude: Math.random(), // 0 to 1
        keywords: [
          mockKeywords[Math.floor(Math.random() * mockKeywords.length)],
          mockKeywords[Math.floor(Math.random() * mockKeywords.length)],
        ].filter((v, i, a) => a.indexOf(v) === i), // Ensure unique keywords
      };

      data.push({ position, archetype });
    }
    return data;
  }, []);

  // Store archetypes in a way that can be accessed by instanceId
  const archetypesByInstanceId = useMemo(() => {
    const map = new Map<number, SharedMemoryArchetype>();
    starData.forEach((star, i) => map.set(i, star.archetype));
    return map;
  }, [starData]);

  // Setup the instanced mesh geometry
  useMemo(() => {
    if (!instancedMeshRef.current) return;
    const dummy = new THREE.Object3D();
    starData.forEach((star, i) => {
      dummy.position.copy(star.position);
      dummy.updateMatrix();
      instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
    });
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [starData]);

  useFrame(() => {
    if (instancedMeshRef.current) {
      instancedMeshRef.current.rotation.y += 0.0001;
    }
  });

  const handleStarClick = (e: any) => { // Using any to access instanceId
    e.stopPropagation();
    if (!e.instanceId) return;

    const archetype = archetypesByInstanceId.get(e.instanceId);
    if (archetype) {
      console.log(`Star ${e.instanceId} clicked. Starting Storytime with archetype:`, archetype);
      startStorytime(archetype);
    } else {
      console.warn(`No archetype found for instanceId: ${e.instanceId}`);
    }
  };

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, STAR_COUNT]}
      onClick={handleStarClick}
    >
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicMaterial color="#FFFFFF" />
    </instancedMesh>
  );
}
