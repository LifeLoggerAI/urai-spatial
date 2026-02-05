'use client';

import { useState } from 'react';

export default function AnchorNode({ position }: { position: [number, number, number] }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <mesh
      position={position}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshBasicMaterial color={isHovered ? 'hotpink' : 'white'} />
    </mesh>
  );
}
