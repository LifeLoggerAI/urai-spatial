"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { lifeChapters } from "./LifeChapters"
import { useLifeMapStore } from "../../engine/state/useLifeMapStore"

export default function ChapterConstellations() {

  const { stars } = useLifeMapStore()

  const geometry = useMemo(() => {

    const positions: number[] = []

    Object.values(lifeChapters).forEach(chapter => {

      const chapterStars = stars.filter(
        star => star.year >= chapter.start && star.year <= chapter.end
      )

      const vectors = chapterStars.map(
        s => new THREE.Vector3(...s.position)
      )

      for (let i = 0; i < vectors.length; i++) {
        for (let j = i + 1; j < vectors.length; j++) {

          const dist = vectors[i].distanceTo(vectors[j])

          if (dist < 5) {

            positions.push(
              vectors[i].x,
              vectors[i].y,
              vectors[i].z,
              vectors[j].x,
              vectors[j].y,
              vectors[j].z
            )

          }

        }
      }

    })

    const geom = new THREE.BufferGeometry()
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    )

    return geom

  }, [stars])

  return (

    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.1}
      />
    </lineSegments>

  )

}