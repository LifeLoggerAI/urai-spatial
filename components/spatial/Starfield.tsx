'use client'

import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useDeterministicStars } from '../../src/stabilize/useDeterministicStars'
import { useSceneStore } from '../../urai-tier1/src/spatial/state/sceneStore'

const STAR_COUNT = 2000

const generateStars = (seed: number) => {
  const a = 1664525
  const c = 1013904223
  const m = 2 ** 32
  let currentSeed = seed

  const random = () => {
    currentSeed = (a * currentSeed + c) % m
    return currentSeed / m
  }

  const arr = new Float32Array(STAR_COUNT * 3)

  for (let i = 0; i < STAR_COUNT; i++) {
    arr[i * 3] = (random() - 0.5) * 40
    arr[i * 3 + 1] = (random() - 0.5) * 40
    arr[i * 3 + 2] = -random() * 50
  }

  return arr
}

export default function Starfield() {

  const pointsRef = useRef<THREE.Points | null>(null)

  const { selectStar, selectedStarId } = useSceneStore()

  const positions = useDeterministicStars(generateStars)

  const colors = useMemo(() => {

    const arr = new Float32Array(STAR_COUNT * 3)

    for (let i = 0; i < STAR_COUNT; i++) {
      arr[i * 3] = 0.3
      arr[i * 3 + 1] = 0.4
      arr[i * 3 + 2] = 0.7
    }

    return arr

  }, [])

  useEffect(() => {

    const points = pointsRef.current
    if (!points) return

    const colorAttr = points.geometry.attributes.color as THREE.BufferAttribute
    const selectedIndex = selectedStarId ? parseInt(selectedStarId) : -1

    for (let i = 0; i < STAR_COUNT; i++) {

      if (i === selectedIndex) {
        colorAttr.setXYZ(i, 1.0, 1.0, 1.0)
      } else {
        colorAttr.setXYZ(i, 0.3, 0.4, 0.7)
      }

    }

    colorAttr.needsUpdate = true

  }, [selectedStarId])

  const tempStar = new THREE.Vector3()

  const handleClick = (event: any) => {

    event.stopPropagation()

    const clickPoint = event.point

    let closestIndex = -1
    let minDistance = Infinity

    for (let i = 0; i < STAR_COUNT; i++) {

      tempStar.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      )

      const dist = clickPoint.distanceTo(tempStar)

      if (dist < minDistance) {
        minDistance = dist
        closestIndex = i
      }

    }

    if (closestIndex !== -1 && minDistance < 1) {

      tempStar.set(
        positions[closestIndex * 3],
        positions[closestIndex * 3 + 1],
        positions[closestIndex * 3 + 2]
      )

      selectStar(closestIndex.toString(), tempStar.clone())

    }

  }

  return (
    <points ref={pointsRef} onClick={handleClick}>

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

      <pointsMaterial
        size={0.05}
        vertexColors
      />

    </points>
  )
}