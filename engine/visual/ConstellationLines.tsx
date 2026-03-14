"use client"

import { useMemo } from "react"
import { Line } from "@react-three/drei"
import { lifeDataset } from "../lifemap/lifeDataset"
import { generateClusters } from "../lifemap/clusterStars"

type Vec3 = [number, number, number]

function dist(a: Vec3, b: Vec3) {

  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]

  return dx * dx + dy * dy + dz * dz
}

export default function ConstellationLines() {

  const clusters = useMemo(() => generateClusters(25), [])

  const lines = useMemo(() => {

    const out: [Vec3, Vec3][] = []

    clusters.forEach(cluster => {

      const stars = cluster.stars.map((id: number) => lifeDataset[id])
      const maxLinks = Math.min(12, stars.length)

      for (let i = 0; i < maxLinks; i++) {

        const a = stars[i]

        let nearest: typeof a | null = null
        let best = Infinity

        for (let j = 0; j < stars.length; j++) {

          const b = stars[j]
          if (a === b) continue

          const d = dist(a.position, b.position)

          if (d < best) {
            best = d
            nearest = b
          }

        }

        if (nearest) {
          out.push([a.position, nearest.position])
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
          lineWidth={1}
          transparent
          opacity={0.25}
        />

      ))}

    </group>

  )

}