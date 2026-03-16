"use client"

import { useMemo } from "react"
import { Line } from "@react-three/drei"
import { lifeDataset } from "../lifemap/lifeDataset"
import { generateClusters } from "../lifemap/clusterStars"

type Vec3 = [number, number, number]

type LifeStar = {
  id: number | string
  position: Vec3
}

function distSq(a: Vec3, b: Vec3) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return dx * dx + dy * dy + dz * dz
}

export default function ConstellationLines() {
  const clusters = useMemo(() => generateClusters(25), [])

  const lines = useMemo(() => {
    const out: [Vec3, Vec3][] = []
    const seen = new Set<string>()

    clusters.forEach((cluster) => {
      const stars: LifeStar[] = cluster.stars
        .map((id: number) => lifeDataset[id])
        .filter(
          (star: any): star is LifeStar =>
            !!star &&
            Array.isArray(star.position) &&
            star.position.length === 3
        )

      const maxLinks = Math.min(12, stars.length)

      for (let i = 0; i < maxLinks; i++) {
        const a = stars[i]

        let nearest: LifeStar | null = null
        let best = Infinity

        for (let j = 0; j < stars.length; j++) {
          const b = stars[j]
          if (a === b) continue

          const d = distSq(a.position, b.position)

          if (d < best) {
            best = d
            nearest = b
          }
        }

        if (nearest) {
          const key = [String(a.id), String(nearest.id)].sort().join("-")

          if (!seen.has(key)) {
            seen.add(key)
            out.push([a.position, nearest.position])
          }
        }
      }
    })

    return out
  }, [clusters])

  return (
    <group>
      {lines.map((pair, i) => (
        <Line
          key={i}
          points={pair}
          color="#7fa8ff"
          transparent
          opacity={0.25}
        />
      ))}
    </group>
  )
}