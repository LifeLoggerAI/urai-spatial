'use client';

import { Sphere } from '@react-three/drei';
import { useState } from 'react';

export default function AnchorNode({ position, label }: { position: [number, number, number], label: string }) {
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  return (
    <Sphere
      position={position}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      scale={active ? 1.5 : 1}
    >
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </Sphere>
  );
}
