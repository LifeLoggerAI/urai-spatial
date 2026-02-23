'use client'

import { useEffect, useMemo } from 'react'
import { segmentIntoChapters, StarData, LifeChapter } from '@/engine/chapters/segmentation'

// Placeholder for generating or fetching real star data
function generateMockStars(count: number): StarData[] {
  const stars: StarData[] = [];
  const now = Date.now();
  const fiveYearsInMillis = 5 * 365 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      position: [ (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200 ],
      emotionalWeight: Math.random(),
      timestamp: now - Math.random() * fiveYearsInMillis,
    });
  }
  return stars;
}

export default function LifeMapScene() {
  const stars = useMemo(() => generateMockStars(500), []);
  const chapters = useMemo(() => segmentIntoChapters(stars), [stars]);

  useEffect(() => {
    console.log("LifeMap Scene Mounted");
    console.log("Generated Stars:", stars.length);
    console.log("Segmented Chapters:", chapters);
  }, [stars, chapters]);

  return (
    <group>
      {/* Visualization will be added in the next step */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="blue" />
      </mesh>
    </group>
  );
}
