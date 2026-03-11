
"use client"

import { useMemo } from "react"
import * as THREE from "three"
import { lifeChapters } from "./LifeChapters"
import { useLifeMapStore } from "../../engine/state/useLifeMapStore"

export default function ChapterConstellations() {
  const { stars } = useLifeMapStore()

  const chapterLines = useMemo(() => {
    const lines: THREE.Vector3[][] = []

    Object.values(lifeChapters).forEach(chapter => {
      const chapterStars = stars.filter(
        star => star.year >= chapter.start && star.year <= chapter.end
      )

      for (let i = 0; i < chapterStars.length; i++) {
        for (let j = i + 1; j < chapterStars.length; j++) {
          const star1 = chapterStars[i]
          const star2 = chapterStars[j]

          const distance = new THREE.Vector3(...star1.position).distanceTo(
            new THREE.Vector3(...star2.position)
          )

          if (distance < 5) {
            lines.push([
              new THREE.Vector3(...star1.position),
              new THREE.Vector3(...star2.position),
            ])
          }
        }
      }
    })

    return lines
  }, [stars])

  return (
    <group>
      {chapterLines.map((line, i) => (
        <line key={i}>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array(line.flatMap(v => v.toArray()))}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            attach="material"
            color="#ffffff"
            transparent
            opacity={0.1}
          />
        </line>
      ))}
    </group>
  )
}
