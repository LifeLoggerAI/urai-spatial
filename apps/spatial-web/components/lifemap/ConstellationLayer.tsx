
'use client'

import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { LifeChapter, StarData } from '@/spatial/logic/segmentation'

interface ConstellationLayerProps {
  chapters: LifeChapter[];
  stars: StarData[]; // Although stars are in chapters, passing the full list might be useful for a global map
}

export function ConstellationLayer({ chapters }: ConstellationLayerProps) {
  const chapterLines = useMemo(() => {
    const lines: [number, number, number][][] = []

    for (const chapter of chapters) {
      // Create lines connecting stars within each chapter
      for (let i = 0; i < chapter.stars.length - 1; i++) {
        const startStar = chapter.stars[i]
        const endStar = chapter.stars[i + 1]

        if (startStar && endStar) {
          lines.push([startStar.position, endStar.position])
        }
      }

      // Optional: Add a line from the chapter's first to last star to close the loop
      if (chapter.stars.length > 1) {
        const firstStar = chapter.stars[0];
        const lastStar = chapter.stars[chapter.stars.length - 1];
        lines.push([firstStar.position, lastStar.position]);
      }
    }
    return lines
  }, [chapters])

  return (
    <group>
      {chapterLines.map((points, i) => (
        <Line
          key={i}
          points={points}
          color="#ffffff"
          opacity={0.15}
          transparent
          lineWidth={1}
        />
      ))}
    </group>
  )
}
