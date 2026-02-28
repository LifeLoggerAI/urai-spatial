import AtmosphereLayer from '@/engine/effects/AtmosphereLayer'

'use client'

import { useMemo } from 'react'
import { segmentIntoChapters, StarData } from '@/spatial/logic/segmentation'
import { getDeterministicPosition, hashStringToFloat } from '@/spatial/logic/hashPosition'
import { ConstellationLayer } from '@/components/lifemap/ConstellationLayer'
import { Stars } from '@react-three/drei'

// A fixed point in time for deterministic generation
const DETERMINISTIC_TIMESTAMP = 1672531200000; // Jan 1, 2023

function generateMockStars(count: number): StarData[] {
  const stars: StarData[] = [];
  const fiveYearsInMillis = 5 * 365 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const id = i.toString();
    stars.push({
      id: i,
      position: getDeterministicPosition(id, 200),
      // V1 LOCK: All emotional weighting is removed.
      // Timestamp is now derived from a fixed point, making it deterministic
      timestamp: DETERMINISTIC_TIMESTAMP - hashStringToFloat(id, 5) * fiveYearsInMillis,
    });
  }
  // Sort stars by timestamp, as segmentation expects this
  return stars.sort((a, b) => a.timestamp - b.timestamp);
}

export default function LifeMapScene() {
  const stars = useMemo(() => generateMockStars(500), []);
  const chapters = useMemo(() => segmentIntoChapters(stars), [stars]);

  return (
      <AtmosphereLayer />
    <group>
      {/* The <Stars /> component is used here just to render the points. */}
      {/* The positions are pre-calculated deterministically. */}
      <Stars count={stars.length} positions={stars.map(s => s.position)} />
      <ConstellationLayer chapters={chapters} stars={stars} />
    </group>
  );
}
