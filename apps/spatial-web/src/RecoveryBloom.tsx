'use client';

import { Sphere } from '@react-three/drei';

export default function RecoveryBloom() {
  return (
    <Sphere args={[0.2, 32, 32]}>
      <meshStandardMaterial color="green" />
    </Sphere>
  );
}
