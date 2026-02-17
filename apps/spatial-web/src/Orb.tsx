'use client';

import { Sphere } from '@react-three/drei';

export default function Orb() {
  return (
    <Sphere args={[0.2, 32, 32]}>
      <meshStandardMaterial color="blue" />
    </Sphere>
  );
}
