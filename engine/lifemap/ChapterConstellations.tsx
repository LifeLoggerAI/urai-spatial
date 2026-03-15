"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { lifeChapters } from "./LifeChapters"
import { useLifeMapStore } from "../../engine/state/useLifeMapStore"

export default function ChapterConstellations() {

  const stars = useLifeMapStore((s) => s.stars)

  const geometry = useMemo(() => {

    const positions: number[] = []

    for (const chapter of Object.values(lifeChapters)) {

      const chapterStars = stars.filter(
        (star) =>
          star.year >= chapter.start &&
          star.year <= chapter.end
      )

      for (let i = 0; i < chapterStars.length; i++) {

        const a = chapterStars[i].position

        for (let j = i + 1; j < chapterStars.length; j++) {

          const b = chapterStars[j].position

          const dx = a[0] - b[0]
          const dy = a[1] - b[1]
          const dz = a[2] - b[2]

          const distSq = dx * dx + dy * dy + dz * dz

          if (distSq < 25) { // 5^2

            positions.push(
              a[0], a[1], a[2],
              b[0], b[1], b[2]
            )

          }

        }

      }

    }

    const geom = new THREE.BufferGeometry()

    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    )

    return geom

  }, [stars])

  return (

    <lineSegments geometry={geometry} frustumCulled={false}>

      <lineBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.1}
      />

    </lineSegments>

  )

}