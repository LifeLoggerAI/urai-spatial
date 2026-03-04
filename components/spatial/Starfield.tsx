'use client'

import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useDeterministicStars } from '../../src/stabilize/useDeterministicStars'
import { useSceneStore } from '../../urai-tier1/src/spatial/state/sceneStore'

const generateStars = (seed: number) => {
  const a = 1664525
  const c = 1013904223
  const m = 2 ** 32
  let currentSeed = seed

  const random = () => {
    currentSeed = (a * currentSeed + c) % m
    return currentSeed / m
  }

  const arr = new Float32Array(2000 * 3)
  for (let i = 0; i < 2000; i++) {
    arr[i * 3] = (random() - 0.5) * 40
    arr[i * 3 + 1] = (random() - 0.5) * 40
    arr[i * 3 + 2] = -random() * 50
  }
  return arr
}

export default function Starfield() {
  const points = useRef<THREE.Points>(null!)
  const { selectStar, selectedStarId } = useSceneStore()

  const positions = useDeterministicStars(generateStars)
  const colors = useMemo(() => {
    const arr = new Float32Array(2000 * 3)
    for (let i = 0; i < 2000; i++) {
      arr[i * 3] = 0.5
      arr[i * 3 + 1] = 0.6
      arr[i * 3 + 2] = 1.0
    }
    return arr
  }, [])

  useEffect(() => {
    if (!points.current) return;
    const colorAttribute = points.current.geometry.attributes.color as THREE.BufferAttribute
    const selectedIndex = selectedStarId ? parseInt(selectedStarId) : -1

    for (let i = 0; i < 2000; i++) {
      if (i === selectedIndex) {
        colorAttribute.setXYZ(i, 1.0, 1.0, 1.0)
      } else {
        colorAttribute.setXYZ(i, 0.3, 0.4, 0.7)
      }
    }
    colorAttribute.needsUpdate = true
  }, [selectedStarId])

  const handleClick = (event: any) => {
    event.stopPropagation();
    const { point } = event;
    let closestStarIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < positions.length / 3; i++) {
      const starPosition = new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      const distance = point.distanceTo(starPosition);
      if (distance < minDistance) {
        minDistance = distance;
        closestStarIndex = i;
      }
    }

    if (closestStarIndex !== -1 && minDistance < 1) {
      const starPosition = new THREE.Vector3(positions[closestStarIndex * 3], positions[closestStarIndex * 3 + 1], positions[closestStarIndex * 3 + 2]);
      selectStar(closestStarIndex.toString(), starPosition);
    }
  };

  return (
    <points ref={points} onClick={handleClick}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors />
    </points>
  )
}
