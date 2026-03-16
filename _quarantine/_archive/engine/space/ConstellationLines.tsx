"use client"

import { useMemo, useEffect } from "react"
import * as THREE from "three"

type Star = {
  position: [number, number, number]
}

const MAX_DIST = 1.6
const MAX_DIST_SQ = MAX_DIST * MAX_DIST

export default function ConstellationLines({ stars }: { stars: Star[] }) {

  const geometry = useMemo(() => {

    const segments: number[] = []

    for (let i = 0; i < stars.length; i++) {

      const a = stars[i].position

      for (let j = i + 1; j < stars.length; j++) {

        const b = stars[j].position

        const dx = a[0] - b[0]
        const dy = a[1] - b[1]
        const dz = a[2] - b[2]

        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < MAX_DIST_SQ) {

          segments.push(a[0], a[1], a[2])
          segments.push(b[0], b[1], b[2])

        }

      }

    }

    const geo = new THREE.BufferGeometry()

    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(segments, 3)
    )

    return geo

  }, [stars])

  useEffect(() => {
    return () => geometry.dispose()
  }, [geometry])

  return (

    <lineSegments geometry={geometry} frustumCulled={false}>

      <lineBasicMaterial
        color="#7aa6ff"
        transparent
        opacity={0.35}
        depthWrite={false}
      />

    </lineSegments>

  )

}