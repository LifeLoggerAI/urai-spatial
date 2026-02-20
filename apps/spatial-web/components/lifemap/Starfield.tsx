import { Star } from "@/lib/lifemap/useLifeMapData";
import { Point, Points } from "@react-three/drei";

// --- PHASE 1: RENDER CORE HARDENING ---

interface StarfieldProps {
    stars: Star[];
}

export default function Starfield({ stars }: StarfieldProps) {
  if (!stars || stars.length === 0) {
    return null;
  }

  // Per Phase 5, render all stars, including those with null positions.
  const validStars = stars.filter(star => star.position);

  return (
    <Points limit={validStars.length}>
      <pointsMaterial color="#fff" size={0.05} />
      {validStars.map((star, i) => (
        <Point key={i} position={star.position} />
      ))}
    </Points>
  );
}
